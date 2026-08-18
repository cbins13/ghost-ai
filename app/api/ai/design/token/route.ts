import { NextRequest, NextResponse } from "next/server";
import { auth as triggerAuth } from "@trigger.dev/sdk";

import { apiError, internalError, notFound, unauthorized } from "@/lib/api-response";
import { getCurrentIdentity, getProjectWithAccess } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

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
  const runId = typeof record.runId === "string" ? record.runId.trim() : "";

  if (!runId) {
    return apiError(400, "VALIDATION_ERROR", "A runId is required.");
  }

  const taskRun = await prisma.taskRun.findUnique({ where: { runId } });

  if (!taskRun) {
    return notFound();
  }

  const project = await getProjectWithAccess(taskRun.projectId, identity);

  if (!project) {
    return notFound();
  }

  try {
    const token = await triggerAuth.createPublicToken({
      scopes: {
        read: {
          runs: [runId],
        },
      },
      expirationTime: "1h",
    });

    return NextResponse.json({ token });
  } catch {
    return internalError();
  }
}
