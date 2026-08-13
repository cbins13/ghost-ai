import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { forbidden, internalError, notFound, unauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ projectId: string; collaboratorId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return unauthorized();
  }

  const { projectId, collaboratorId } = await params;

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      return notFound();
    }

    if (project.ownerId !== userId) {
      return forbidden("Only the project owner can remove collaborators.");
    }

    const collaborator = await prisma.projectCollaborator.findUnique({ where: { id: collaboratorId } });

    if (collaborator?.projectId !== projectId) {
      return notFound("The collaborator could not be found.");
    }

    await prisma.projectCollaborator.delete({ where: { id: collaboratorId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return notFound();
    }
    return internalError();
  }
}
