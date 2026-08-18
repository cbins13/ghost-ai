import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";

import { apiError, forbidden, internalError, notFound, unauthorized } from "@/lib/api-response";
import { getCurrentIdentity, getProjectWithAccess } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import type { generateSpecTask } from "@/src/trigger/generate-spec";
import { generateSpecPayloadSchema } from "@/types/tasks";

const specRequestSchema = generateSpecPayloadSchema
  .omit({ projectId: true })
  .extend({ projectId: z.string().min(1).optional() });

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

  const parsed = specRequestSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "A valid roomId, chatHistory, nodes, and edges are required.");
  }

  const { roomId, chatHistory, nodes, edges, projectId: suppliedProjectId } = parsed.data;

  const project = await getProjectWithAccess(roomId, identity);

  if (!project) {
    return notFound();
  }

  if (suppliedProjectId !== undefined && suppliedProjectId !== project.id) {
    return forbidden("The supplied project does not match the room.");
  }

  try {
    const handle = await tasks.trigger<typeof generateSpecTask>("generate-spec", {
      projectId: project.id,
      roomId,
      chatHistory,
      nodes,
      edges,
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
    console.error("Failed to trigger generate-spec task", error);
    return internalError();
  }
}
