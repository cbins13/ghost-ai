import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { APICallError, generateObject, NoObjectGeneratedError, RetryError } from "ai";
import { logger, task } from "@trigger.dev/sdk";
import { z } from "zod";

import { mutateFlow } from "@liveblocks/react-flow/node";

import { parseCanvasState } from "@/lib/canvas-validation";
import type { CanvasState } from "@/lib/canvas-storage";
import { ensureEffectApplied } from "@/lib/design-agent-effects";
import { DESIGN_AGENT_USER_INFO, getDesignAgentUserId, getLiveblocksClient } from "@/lib/liveblocks";
import { MAX_NODE_DIMENSION, MIN_NODE_DIMENSION, NODE_COLORS, NODE_SHAPES } from "@/types/canvas";
import type { CanvasEdge, CanvasNode, CanvasNodeShape } from "@/types/canvas";
import { aiChatMessageSchema } from "@/types/tasks";

interface DesignAgentPayload {
  prompt: string;
  roomId: string;
}

const MAX_LABEL_LENGTH = 200;
const MAX_ACTIONS_PER_PLAN = 60;
const MAX_SUMMARY_LENGTH = 300;

/**
 * Gemini's structured output does not enforce JSON Schema `anyOf`, so a
 * discriminated union of action objects makes the model ignore the schema
 * entirely. Sparse objects full of optional fields trigger a separate
 * constrained-decoding failure (runaway digits in numeric fields). The plan is
 * therefore modelled as one dense array per action kind, and flattened back
 * into a single ordered action list in code.
 */
const coordinateSchema = z.number().int();
const dimensionSchema = z.number().int().min(MIN_NODE_DIMENSION).max(MAX_NODE_DIMENSION);
const colorIndexSchema = z.number().int().min(0).max(NODE_COLORS.length - 1);
const shapeSchema = z.enum(NODE_SHAPES as [CanvasNodeShape, ...CanvasNodeShape[]]);
const labelSchema = z.string().max(MAX_LABEL_LENGTH);

const designPlanSchema = z.object({
  summary: z
    .string()
    .min(1)
    .max(MAX_SUMMARY_LENGTH)
    .describe(
      "A one-sentence, past-tense summary of what was designed, written for a chat reply (e.g. \"Designed a login page with a blue header, an email input, and a submit button.\").",
    ),
  addNodes: z.array(
    z.object({
      actionId: z.string().min(1),
      nodeId: z.string().min(1),
      shape: shapeSchema,
      colorIndex: colorIndexSchema,
      label: labelSchema,
      x: coordinateSchema,
      y: coordinateSchema,
      width: dimensionSchema,
      height: dimensionSchema,
    }),
  ),
  addEdges: z.array(
    z.object({
      actionId: z.string().min(1),
      edgeId: z.string().min(1),
      source: z.string().min(1),
      target: z.string().min(1),
      label: labelSchema,
    }),
  ),
  moveNodes: z.array(
    z.object({
      actionId: z.string().min(1),
      nodeId: z.string().min(1),
      x: coordinateSchema,
      y: coordinateSchema,
    }),
  ),
  resizeNodes: z.array(
    z.object({
      actionId: z.string().min(1),
      nodeId: z.string().min(1),
      width: dimensionSchema,
      height: dimensionSchema,
    }),
  ),
  updateNodes: z.array(
    z.object({
      actionId: z.string().min(1),
      nodeId: z.string().min(1),
      label: labelSchema,
      colorIndex: colorIndexSchema,
      shape: shapeSchema,
    }),
  ),
  deleteNodes: z.array(
    z.object({
      actionId: z.string().min(1),
      nodeId: z.string().min(1),
    }),
  ),
  deleteEdges: z.array(
    z.object({
      actionId: z.string().min(1),
      edgeId: z.string().min(1),
    }),
  ),
});

type DesignPlan = z.infer<typeof designPlanSchema>;

type DesignAction =
  | {
      type: "addNode";
      actionId: string;
      nodeId: string;
      shape: CanvasNodeShape;
      colorIndex: number;
      label: string;
      position: { x: number; y: number };
      width: number;
      height: number;
    }
  | { type: "moveNode"; actionId: string; nodeId: string; position: { x: number; y: number } }
  | { type: "resizeNode"; actionId: string; nodeId: string; width: number; height: number }
  | {
      type: "updateNodeData";
      actionId: string;
      nodeId: string;
      label?: string;
      colorIndex?: number;
      shape?: CanvasNodeShape;
    }
  | { type: "deleteNode"; actionId: string; nodeId: string }
  | { type: "addEdge"; actionId: string; edgeId: string; source: string; target: string; label?: string }
  | { type: "deleteEdge"; actionId: string; edgeId: string };

/**
 * Flattens the per-kind plan arrays into a single ordered action list.
 * Deletions run first so freed IDs can be reused, then structural additions,
 * then adjustments to existing nodes.
 */
function flattenPlan(plan: DesignPlan): DesignAction[] {
  return [
    ...plan.deleteEdges.map((action): DesignAction => ({ type: "deleteEdge", ...action })),
    ...plan.deleteNodes.map((action): DesignAction => ({ type: "deleteNode", ...action })),
    ...plan.addNodes.map(({ x, y, ...action }): DesignAction => ({
      type: "addNode",
      ...action,
      position: { x, y },
    })),
    ...plan.addEdges.map((action): DesignAction => ({ type: "addEdge", ...action })),
    ...plan.moveNodes.map(({ x, y, ...action }): DesignAction => ({
      type: "moveNode",
      ...action,
      position: { x, y },
    })),
    ...plan.resizeNodes.map((action): DesignAction => ({ type: "resizeNode", ...action })),
    ...plan.updateNodes.map((action): DesignAction => ({ type: "updateNodeData", ...action })),
  ].slice(0, MAX_ACTIONS_PER_PLAN);
}

let googleProvider: ReturnType<typeof createGoogleGenerativeAI> | null = null;

function getGoogleModel() {
  if (!googleProvider) {
    googleProvider = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY });
  }
  return googleProvider("gemini-flash-lite-latest");
}

function isQuotaExceededError(error: unknown): boolean {
  const apiError = RetryError.isInstance(error) ? error.lastError : error;

  if (APICallError.isInstance(apiError) && apiError.statusCode === 429) {
    return true;
  }

  const message = apiError instanceof Error ? apiError.message : String(apiError);
  return /quota|rate.?limit/i.test(message);
}

function resolveColor(colorIndex: number) {
  return NODE_COLORS[colorIndex] ?? NODE_COLORS[0];
}

/**
 * Applies a plan's actions to an in-memory snapshot of the canvas so the
 * result can be validated against the existing canvas schema before any
 * action is applied to the live Liveblocks room.
 */
function projectPlan(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  actions: DesignAction[],
): { nodes: CanvasNode[]; edges: CanvasEdge[] } | null {
  let nextNodes = [...nodes];
  let nextEdges = [...edges];

  for (const action of actions) {
    switch (action.type) {
      case "addNode": {
        if (nextNodes.some((node) => node.id === action.nodeId)) {
          return null;
        }
        const color = resolveColor(action.colorIndex);
        nextNodes.push({
          id: action.nodeId,
          type: "canvasNode",
          position: action.position,
          width: action.width,
          height: action.height,
          data: { label: action.label, color: color.fill, textColor: color.text, shape: action.shape },
        });
        break;
      }
      case "moveNode": {
        const index = nextNodes.findIndex((node) => node.id === action.nodeId);
        if (index === -1) {
          return null;
        }
        nextNodes[index] = { ...nextNodes[index], position: action.position };
        break;
      }
      case "resizeNode": {
        const index = nextNodes.findIndex((node) => node.id === action.nodeId);
        if (index === -1) {
          return null;
        }
        nextNodes[index] = { ...nextNodes[index], width: action.width, height: action.height };
        break;
      }
      case "updateNodeData": {
        const index = nextNodes.findIndex((node) => node.id === action.nodeId);
        if (index === -1) {
          return null;
        }
        const color = action.colorIndex !== undefined ? resolveColor(action.colorIndex) : undefined;
        nextNodes[index] = {
          ...nextNodes[index],
          data: {
            ...nextNodes[index].data,
            ...(action.label !== undefined ? { label: action.label } : {}),
            ...(color ? { color: color.fill, textColor: color.text } : {}),
            ...(action.shape !== undefined ? { shape: action.shape } : {}),
          },
        };
        break;
      }
      case "deleteNode": {
        if (!nextNodes.some((node) => node.id === action.nodeId)) {
          return null;
        }
        nextNodes = nextNodes.filter((node) => node.id !== action.nodeId);
        nextEdges = nextEdges.filter((edge) => edge.source !== action.nodeId && edge.target !== action.nodeId);
        break;
      }
      case "addEdge": {
        if (nextEdges.some((edge) => edge.id === action.edgeId)) {
          return null;
        }
        if (!nextNodes.some((node) => node.id === action.source) || !nextNodes.some((node) => node.id === action.target)) {
          return null;
        }
        nextEdges.push({
          id: action.edgeId,
          type: "canvasEdge",
          source: action.source,
          target: action.target,
          data: { label: action.label },
        });
        break;
      }
      case "deleteEdge": {
        if (!nextEdges.some((edge) => edge.id === action.edgeId)) {
          return null;
        }
        nextEdges = nextEdges.filter((edge) => edge.id !== action.edgeId);
        break;
      }
    }
  }

  return { nodes: nextNodes, edges: nextEdges };
}

function buildPrompt(userPrompt: string, snapshot: CanvasState): string {
  const existingNodes = snapshot.nodes
    .map((node) => `- ${node.id}: "${node.data.label}" (${node.data.shape})`)
    .join("\n");

  return [
    "You are a system design assistant. Translate the user's request into a sequence of",
    "canvas actions that add, move, resize, update, or remove nodes and edges on a",
    "collaborative architecture diagram.",
    "",
    "Rules:",
    `- Only use shapes from: ${NODE_SHAPES.join(", ")}.`,
    `- Only use colorIndex values from 0 to ${NODE_COLORS.length - 1} (the app's fixed palette).`,
    "- Keep node labels short and descriptive (service/component names).",
    "- Lay nodes out left-to-right or top-to-bottom with clear spacing (at least 220px apart) so they never overlap.",
    "- Reference only node IDs that already exist on the canvas or that this plan itself adds via addNodes.",
    "- Give every action a unique, stable actionId.",
    `- All coordinates and sizes must be whole numbers. Widths and heights must be between ${MIN_NODE_DIMENSION} and ${MAX_NODE_DIMENSION}.`,
    "- The plan has one array per kind of change. Return every array, using [] for the kinds you do not need:",
    "  addNodes, addEdges, moveNodes, resizeNodes, updateNodes, deleteNodes, deleteEdges.",
    "- Every object in an array must include all of that array's fields.",
    "  Use an empty string for an edge label you do not want to show.",
    "  updateNodes rewrites label, colorIndex and shape together, so repeat the current values",
    "  for the properties you want to leave unchanged.",
    "- To build something new, put the work in addNodes and addEdges and leave the other arrays empty.",
    "- Include a \"summary\" field: one short past-tense sentence describing what you designed,",
    "  suitable as a chat reply to the user (e.g. \"Designed a login page with a blue header,",
    "  an email input, and a submit button.\").",
    "",
    existingNodes ? `Existing canvas nodes:\n${existingNodes}` : "The canvas is currently empty.",
    "",
    `User request: ${userPrompt}`,
  ].join("\n");
}

async function readCanvasSnapshot(roomId: string): Promise<CanvasState> {
  let snapshot: CanvasState = { nodes: [], edges: [] };

  await mutateFlow<CanvasNode, CanvasEdge>(
    { client: getLiveblocksClient(), roomId },
    (flow) => {
      snapshot = { nodes: [...flow.nodes], edges: [...flow.edges] };
    },
  );

  return snapshot;
}

async function publishStatus(
  runId: string,
  roomId: string,
  actionId: string,
  status: "started" | "processing" | "complete" | "error",
  message: string,
) {
  await ensureEffectApplied(runId, actionId, "status", { status, message }, async () => {
    await getLiveblocksClient().broadcastEvent(roomId, {
      type: "design-agent-status",
      runId,
      status,
      message,
    });
  });
}

async function broadcastAssistantReply(runId: string, roomId: string, actionId: string, content: string) {
  await ensureEffectApplied(runId, actionId, "chat-message", { content }, async () => {
    const message = aiChatMessageSchema.parse({
      type: "ai-chat-message",
      sender: DESIGN_AGENT_USER_INFO.name,
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
    });
    await getLiveblocksClient().broadcastEvent(roomId, message);
  });
}

async function setAgentPresence(
  runId: string,
  roomId: string,
  actionId: string,
  thinking: boolean,
  cursor: { x: number; y: number } | null,
) {
  await ensureEffectApplied(runId, actionId, "presence", { thinking, cursor }, async () => {
    await getLiveblocksClient().setPresence(roomId, {
      userId: getDesignAgentUserId(runId),
      userInfo: DESIGN_AGENT_USER_INFO,
      data: { cursor, thinking },
    });
  });
}

async function applyAction(runId: string, roomId: string, action: DesignAction): Promise<void> {
  const effectType = action.type === "addEdge" || action.type === "deleteEdge" ? "edge" : "node";

  await ensureEffectApplied(runId, action.actionId, effectType, action, async () => {
    await mutateFlow<CanvasNode, CanvasEdge>({ client: getLiveblocksClient(), roomId }, (flow) => {
      switch (action.type) {
        case "addNode": {
          if (flow.getNode(action.nodeId)) {
            return;
          }
          const color = resolveColor(action.colorIndex);
          flow.addNode({
            id: action.nodeId,
            type: "canvasNode",
            position: action.position,
            width: action.width,
            height: action.height,
            data: { label: action.label, color: color.fill, textColor: color.text, shape: action.shape },
          });
          break;
        }
        case "moveNode": {
          const node = flow.getNode(action.nodeId);
          if (!node || (node.position.x === action.position.x && node.position.y === action.position.y)) {
            return;
          }
          flow.updateNode(action.nodeId, { position: action.position });
          break;
        }
        case "resizeNode": {
          const node = flow.getNode(action.nodeId);
          if (!node || (node.width === action.width && node.height === action.height)) {
            return;
          }
          flow.updateNode(action.nodeId, { width: action.width, height: action.height });
          break;
        }
        case "updateNodeData": {
          const node = flow.getNode(action.nodeId);
          if (!node) {
            return;
          }
          const color = action.colorIndex !== undefined ? resolveColor(action.colorIndex) : undefined;
          flow.updateNodeData(action.nodeId, {
            ...(action.label !== undefined ? { label: action.label } : {}),
            ...(color ? { color: color.fill, textColor: color.text } : {}),
            ...(action.shape !== undefined ? { shape: action.shape } : {}),
          });
          break;
        }
        case "deleteNode": {
          if (!flow.getNode(action.nodeId)) {
            return;
          }
          flow.removeNode(action.nodeId);
          break;
        }
        case "addEdge": {
          if (flow.getEdge(action.edgeId)) {
            return;
          }
          flow.addEdge({
            id: action.edgeId,
            type: "canvasEdge",
            source: action.source,
            target: action.target,
            data: { label: action.label },
          });
          break;
        }
        case "deleteEdge": {
          if (!flow.getEdge(action.edgeId)) {
            return;
          }
          flow.removeEdge(action.edgeId);
          break;
        }
      }
    });
  });
}

export const designAgentTask = task({
  id: "design-agent",
  maxDuration: 300,
  run: async (payload: DesignAgentPayload, { ctx }) => {
    const runId = ctx.run.id;
    const { roomId } = payload;

    logger.log("Design agent run started", {
      runId,
      roomId,
      promptLength: payload.prompt.length,
    });

    try {
      await setAgentPresence(runId, roomId, "start", true, null);
      await publishStatus(runId, roomId, "start", "started", "Ghost AI is reading the prompt…");

      const snapshot = await readCanvasSnapshot(roomId);

      let plan: DesignPlan;
      try {
        const result = await generateObject({
          model: getGoogleModel(),
          schema: designPlanSchema,
          prompt: buildPrompt(payload.prompt, snapshot),
          maxRetries: 2,
        });
        plan = result.object;
      } catch (error) {
        if (NoObjectGeneratedError.isInstance(error)) {
          logger.warn("Design agent plan rejected validation", {
            runId,
            roomId,
            reason: error.message,
            modelOutput: error.text,
          });
          await publishStatus(
            runId,
            roomId,
            "validation-failed",
            "error",
            "Ghost AI couldn't generate a valid design for that prompt. Try rephrasing it.",
          );
          return { runId, applied: 0 };
        }
        if (isQuotaExceededError(error)) {
          logger.warn("Design agent hit the Gemini API quota", { runId, roomId });
          await publishStatus(
            runId,
            roomId,
            "quota-exceeded",
            "error",
            "Ghost AI is rate limited right now. Please wait a minute and try again.",
          );
          return { runId, applied: 0 };
        }
        throw error;
      }

      const actions = flattenPlan(plan);
      const projected = projectPlan(snapshot.nodes, snapshot.edges, actions);

      if (!projected || !parseCanvasState(projected)) {
        logger.warn("Design agent projected canvas rejected validation", {
          runId,
          roomId,
          actionCount: actions.length,
        });
        await publishStatus(
          runId,
          roomId,
          "validation-failed",
          "error",
          "Ghost AI couldn't generate a valid design for that prompt. Try rephrasing it.",
        );
        return { runId, applied: 0 };
      }

      await publishStatus(runId, roomId, "processing", "processing", `Applying ${actions.length} change(s) to the canvas…`);

      for (const action of actions) {
        await setAgentPresence(runId, roomId, `presence:${action.actionId}`, true, resolveActionCursor(action));
        await applyAction(runId, roomId, action);
      }

      await publishStatus(runId, roomId, "complete", "complete", "Ghost AI finished updating the canvas.");
      await broadcastAssistantReply(runId, roomId, "reply", plan.summary);

      logger.log("Design agent run completed", { runId, roomId, actionCount: actions.length });

      return { runId, applied: actions.length };
    } catch (error) {
      logger.error("Design agent run failed", {
        runId,
        roomId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      await publishStatus(runId, roomId, "error", "error", "Ghost AI ran into a problem generating this design.");
      throw error;
    } finally {
      await setAgentPresence(runId, roomId, "end", false, null);
    }
  },
});

function resolveActionCursor(action: DesignAction): { x: number; y: number } | null {
  if (action.type === "addNode" || action.type === "moveNode") {
    return action.position;
  }
  return null;
}
