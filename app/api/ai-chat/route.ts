import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { apiError, forbidden, internalError, unauthorized } from "@/lib/api-response";
import { getLiveblocksClient } from "@/lib/liveblocks";
import { getCurrentIdentity, getProjectWithAccess } from "@/lib/project-access";
import { aiChatMessageSchema, aiChatSendSchema } from "@/types/tasks";

export async function POST(request: NextRequest) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = aiChatSendSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "A valid room and message content are required.");
  }

  const project = await getProjectWithAccess(parsed.data.room, identity);

  if (!project) {
    return forbidden();
  }

  const user = await currentUser();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  const sender = name || identity.email || identity.userId;

  const message = aiChatMessageSchema.parse({
    type: "ai-chat-message",
    sender,
    role: "user",
    content: parsed.data.content,
    createdAt: new Date().toISOString(),
  });

  try {
    await getLiveblocksClient().broadcastEvent(project.id, message);
  } catch (error) {
    const details =
      error instanceof Error
        ? { message: error.message, ...("status" in error ? { status: error.status } : {}) }
        : error;
    console.error("Failed to broadcast ai-chat message", details);
    return internalError("Could not send your message. Please try again.");
  }

  return NextResponse.json({ message });
}
