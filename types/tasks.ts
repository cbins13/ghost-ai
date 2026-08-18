import { z } from "zod";

export const aiChatSendSchema = z.object({
  room: z.string().min(1),
  content: z.string().trim().min(1).max(4000),
});

export type AiChatSendInput = z.infer<typeof aiChatSendSchema>;

export const aiChatMessageSchema = z.object({
  type: z.literal("ai-chat-message"),
  sender: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
  createdAt: z.string(),
});

export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;

const specChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const specCanvasNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("canvasNode"),
  position: z.object({ x: z.number(), y: z.number() }),
  width: z.number(),
  height: z.number(),
  data: z.object({
    label: z.string(),
    color: z.string(),
    textColor: z.string(),
    shape: z.string(),
  }),
});

const specCanvasEdgeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("canvasEdge").optional(),
  source: z.string().min(1),
  target: z.string().min(1),
  data: z.object({ label: z.string().optional() }).optional(),
});

export const generateSpecPayloadSchema = z.object({
  projectId: z.string().min(1),
  roomId: z.string().min(1),
  chatHistory: z.array(specChatMessageSchema).max(200),
  nodes: z.array(specCanvasNodeSchema).max(500),
  edges: z.array(specCanvasEdgeSchema).max(1_000),
});

export type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>;
