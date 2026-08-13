import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import type { Prisma } from "@/app/generated/prisma/client";
import { apiError, internalError, unauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { createRequestFingerprint, getIdempotencyKey, getIdempotentResponse } from "@/lib/project-idempotency";
import { getVerifiedPrimaryEmail } from "@/lib/project-access";
import { getUserProjects, resolveCreateName, toProjectDto } from "@/lib/projects";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return unauthorized();
  }

  try {
    const user = await currentUser();
    const email = getVerifiedPrimaryEmail(user);
    const projects = await getUserProjects(userId, email);

    return NextResponse.json(projects);
  } catch {
    return internalError();
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return unauthorized();
  }

  const idempotencyKey = getIdempotencyKey(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "Invalid JSON in request body");
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return apiError(400, "VALIDATION_ERROR", "Request body must be a JSON object");
  }

  const rawName = (body as Record<string, unknown>).name;
  const nameResult = resolveCreateName(rawName);

  if (!nameResult.ok) {
    return apiError(400, "VALIDATION_ERROR", nameResult.message);
  }

  const requestFingerprint = createRequestFingerprint("create", undefined, nameResult.name);
  const replay = await getIdempotentResponse(userId, idempotencyKey, "create", requestFingerprint);

  if (replay) {
    return replay;
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const project = await transaction.project.create({
        data: {
          name: nameResult.name,
          ownerId: userId,
        },
      });
      const projectDto = toProjectDto(project);
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
            operation: "create",
            requestFingerprint,
            responseStatus: 201,
            responseBody,
          },
        });
      }

      return responseBody;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const replay = await getIdempotentResponse(userId, idempotencyKey, "create", requestFingerprint);
      if (replay) {
        return replay;
      }
    }
    return internalError();
  }
}
