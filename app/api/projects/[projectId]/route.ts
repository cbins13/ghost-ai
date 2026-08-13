import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import type { Prisma } from "@/app/generated/prisma/client";
import {
  apiError,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { createRequestFingerprint, getIdempotencyKey, getIdempotentResponse } from "@/lib/project-idempotency";
import { resolveRenameName, toProjectDto } from "@/lib/projects";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return unauthorized();
  }

  const { projectId } = await params;
  const idempotencyKey = getIdempotencyKey(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const rawName = typeof body === "object" && body !== null ? (body as Record<string, unknown>).name : undefined;
  const nameResult = resolveRenameName(rawName);

  if (!nameResult.ok) {
    return apiError(400, "VALIDATION_ERROR", nameResult.message);
  }

  const requestFingerprint = createRequestFingerprint("rename", projectId, nameResult.name);
  const replay = await getIdempotentResponse(userId, idempotencyKey, "rename", requestFingerprint, projectId);

  if (replay) {
    return replay;
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      return notFound();
    }

    if (project.ownerId !== userId) {
      return forbidden("Only the project owner can rename this project.");
    }

    const result = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.project.update({
        where: { id: projectId },
        data: { name: nameResult.name },
      });
      const projectDto = toProjectDto(updated);
      const responseBody = {
        project: {
          id: projectDto.id,
          name: projectDto.name,
          ownerId: projectDto.ownerId,
          createdAt: projectDto.createdAt,
          updatedAt: projectDto.updatedAt,
        },
      } satisfies Prisma.InputJsonObject;

      if (idempotencyKey) {
        await transaction.projectMutation.create({
          data: {
            userId,
            idempotencyKey,
            operation: "rename",
            projectId,
            requestFingerprint,
            responseStatus: 200,
            responseBody,
          },
        });
      }

      return responseBody;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const replay = await getIdempotentResponse(userId, idempotencyKey, "rename", requestFingerprint, projectId);
      if (replay) {
        return replay;
      }
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return notFound();
    }
    return internalError();
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return unauthorized();
  }

  const { projectId } = await params;
  const idempotencyKey = getIdempotencyKey(_request);
  const requestFingerprint = createRequestFingerprint("delete", projectId);
  const replay = await getIdempotentResponse(userId, idempotencyKey, "delete", requestFingerprint, projectId);

  if (replay) {
    return replay;
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      return notFound();
    }

    if (project.ownerId !== userId) {
      return forbidden("Only the project owner can delete this project.");
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.project.delete({ where: { id: projectId } });

      if (idempotencyKey) {
        await transaction.projectMutation.create({
          data: {
            userId,
            idempotencyKey,
            operation: "delete",
            projectId,
            requestFingerprint,
            responseStatus: 204,
          },
        });
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const replay = await getIdempotentResponse(userId, idempotencyKey, "delete", requestFingerprint, projectId);
      if (replay) {
        return replay;
      }
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      const replay = await getIdempotentResponse(userId, idempotencyKey, "delete", requestFingerprint, projectId);
      if (replay) {
        return replay;
      }
      return notFound();
    }
    return internalError();
  }
}
