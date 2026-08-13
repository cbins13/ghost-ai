import { NextRequest, NextResponse } from "next/server";

import { apiError, conflict, forbidden, internalError, notFound, unauthorized } from "@/lib/api-response";
import { getEnrichedCollaborators, isValidEmail } from "@/lib/collaborators";
import { getCurrentIdentity, getProjectWithAccess } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return unauthorized();
  }

  const { projectId } = await params;
  const project = await getProjectWithAccess(projectId, identity);

  if (!project) {
    return notFound();
  }

  try {
    const collaborators = await getEnrichedCollaborators(projectId);
    return NextResponse.json({ collaborators });
  } catch {
    return internalError();
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return unauthorized();
  }

  const { projectId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const rawEmail = typeof body === "object" && body !== null ? (body as Record<string, unknown>).email : undefined;

  if (typeof rawEmail !== "string" || !isValidEmail(rawEmail.trim())) {
    return apiError(400, "VALIDATION_ERROR", "A valid email address is required.");
  }

  const email = rawEmail.trim().toLowerCase();

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      return notFound();
    }

    if (project.ownerId !== identity.userId) {
      return forbidden("Only the project owner can invite collaborators.");
    }

    if (identity.email && normalizeEmail(identity.email) === email) {
      return apiError(400, "VALIDATION_ERROR", "You already have access to this project.");
    }

    const existing = await prisma.projectCollaborator.findUnique({
      where: { projectId_email: { projectId, email } },
    });

    if (existing) {
      return conflict("This person is already a collaborator.");
    }

    await prisma.projectCollaborator.create({ data: { projectId, email } });

    const collaborators = await getEnrichedCollaborators(projectId);
    return NextResponse.json({ collaborators }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return conflict("This person is already a collaborator.");
    }
    return internalError();
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
