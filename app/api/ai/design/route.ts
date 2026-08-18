import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";

import { apiError, forbidden, internalError, notFound, unauthorized } from "@/lib/api-response";
import { getCurrentIdentity, getProjectWithAccess } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import type { designAgentTask } from "@/src/trigger/design-agent";

export async function POST(request: NextRequest) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const prompt = typeof record.prompt === "string" ? record.prompt.trim() : "";
  const roomId = typeof record.roomId === "string" ? record.roomId.trim() : "";
  const suppliedProjectId = typeof record.projectId === "string" ? record.projectId.trim() : undefined;

  if (!prompt || !roomId) {
    return apiError(400, "VALIDATION_ERROR", "A prompt and roomId are required.");
  }

  const project = await getProjectWithAccess(roomId, identity);

  if (!project) {
    return notFound();
  }

  if (suppliedProjectId !== undefined && suppliedProjectId !== project.id) {
    return forbidden("The supplied project does not match the room.");
  }

  try {
    const handle = await tasks.trigger<typeof designAgentTask>("design-agent", {
      prompt,
      roomId,
    });

    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId: project.id,
        userId: identity.userId,
      },
    });

    return NextResponse.json({ runId: handle.id });
  } catch (error) {
    console.error("Failed to trigger design-agent task", error);
    return internalError();
  }
}
