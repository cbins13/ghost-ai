import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { logger, metadata, task } from "@trigger.dev/sdk";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { saveGeneratedSpec } from "@/lib/spec-storage";
import { generateSpecPayloadSchema } from "@/types/tasks";

type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>;

let googleProvider: ReturnType<typeof createGoogleGenerativeAI> | null = null;

function getGoogleModel() {
  if (!googleProvider) {
    googleProvider = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY });
  }
  return googleProvider("gemini-flash-lite-latest");
}

/**
 * `roomId` and `projectId` are the same value in this app (see `design-agent.ts`),
 * but the binding is re-verified here against Prisma rather than trusted from the
 * payload, so a directly-triggered or retried run can never generate a spec for a
 * project it wasn't authorized against at trigger time.
 */
async function verifyOwnershipBinding(projectId: string, roomId: string): Promise<boolean> {
  if (projectId !== roomId) {
    return false;
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  return project !== null;
}

function buildPrompt(payload: GenerateSpecPayload): string {
  const nodesSection = payload.nodes
    .map((node) => `- ${node.id}: "${node.data.label}" (${node.data.shape})`)
    .join("\n");

  const edgesSection = payload.edges
    .map((edge) => `- ${edge.source} -> ${edge.target}${edge.data?.label ? ` (${edge.data.label})` : ""}`)
    .join("\n");

  const chatSection = payload.chatHistory
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");

  return [
    "You are a technical writer producing a technical specification document for a system",
    "design that a team has been sketching out on a collaborative architecture canvas.",
    "",
    "Write the spec in Markdown. Include sections such as Overview, Components, Data Flow,",
    "and any Open Questions or risks implied by the canvas or conversation. Base the content",
    "only on the canvas nodes/edges and chat history given below — do not invent components",
    "that aren't represented there.",
    "",
    nodesSection ? `Canvas nodes:\n${nodesSection}` : "The canvas currently has no nodes.",
    "",
    edgesSection ? `Canvas connections:\n${edgesSection}` : "The canvas currently has no connections.",
    "",
    chatSection ? `Conversation history:\n${chatSection}` : "There is no prior conversation history.",
  ].join("\n");
}

export const generateSpecTask = task({
  id: "generate-spec",
  maxDuration: 300,
  run: async (rawPayload: GenerateSpecPayload, { ctx }) => {
    const runId = ctx.run.id;
    const payload = generateSpecPayloadSchema.parse(rawPayload);

    logger.log("Generate spec run started", {
      runId,
      roomId: payload.roomId,
      projectId: payload.projectId,
      nodeCount: payload.nodes.length,
      edgeCount: payload.edges.length,
    });

    metadata.set("status", "started");

    const isBindingValid = await verifyOwnershipBinding(payload.projectId, payload.roomId);

    if (!isBindingValid) {
      logger.error("Generate spec rejected: projectId/roomId binding failed verification", {
        runId,
        roomId: payload.roomId,
        projectId: payload.projectId,
      });
      metadata.set("status", "error");
      throw new Error("Project and room do not match an authorized project.");
    }

    try {
      metadata.set("status", "generating");

      const result = await generateText({
        model: getGoogleModel(),
        prompt: buildPrompt(payload),
        maxRetries: 2,
      });

      const specRecord = await saveGeneratedSpec(
        payload.projectId,
        runId,
        `spec-${payload.projectId}.md`,
        result.text
      );

      metadata.set("status", "complete");
      logger.log("Generate spec run completed", { runId, roomId: payload.roomId, specId: specRecord.id });

      return { runId, spec: result.text, specId: specRecord.id };
    } catch (error) {
      metadata.set("status", "error");
      logger.error("Generate spec run failed", {
        runId,
        roomId: payload.roomId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
});
