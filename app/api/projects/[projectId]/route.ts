import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  apiError,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
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

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      return notFound();
    }

    if (project.ownerId !== userId) {
      return forbidden("Only the project owner can rename this project.");
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { name: nameResult.name },
    });

    return NextResponse.json({ project: toProjectDto(updated) });
  } catch {
    return internalError();
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return unauthorized();
  }

  const { projectId } = await params;

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      return notFound();
    }

    if (project.ownerId !== userId) {
      return forbidden("Only the project owner can delete this project.");
    }

    await prisma.project.delete({ where: { id: projectId } });

    return new NextResponse(null, { status: 204 });
  } catch {
    return internalError();
  }
}
