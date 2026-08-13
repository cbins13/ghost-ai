import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { apiError, internalError, unauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getUserProjects, resolveCreateName, toProjectDto } from "@/lib/projects";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return unauthorized();
  }

  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "Invalid JSON in request body.");
  }

  if (body !== null && typeof body !== "object") {
    return apiError(400, "VALIDATION_ERROR", "Request body must be an object.");
  }

  const rawName = body !== null && typeof body === "object" ? (body as Record<string, unknown>).name : undefined;
  const nameResult = resolveCreateName(rawName);

  if (!nameResult.ok) {
    return apiError(400, "VALIDATION_ERROR", nameResult.message);
  }

  try {
    const project = await prisma.project.create({
      data: {
        name: nameResult.name,
        ownerId: userId,
      },
    });

    return NextResponse.json({ project: toProjectDto(project) }, { status: 201 });
  } catch {
    return internalError();
  }
}
