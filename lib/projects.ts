import type { Project } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";

const PROJECT_NAME_MAX_LENGTH = 120;
const DEFAULT_PROJECT_NAME = "Untitled Project";

export interface ProjectDto {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export function toProjectDto(project: Project): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    ownerId: project.ownerId,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export type NameValidationResult =
  | { ok: true; name: string }
  | { ok: false; message: string };

export function resolveCreateName(rawName: unknown): NameValidationResult {
  if (rawName !== undefined && typeof rawName !== "string") {
    return { ok: false, message: "Project name must be a string." };
  }

  const trimmed = (rawName ?? "").trim();
  const name = trimmed.length === 0 ? DEFAULT_PROJECT_NAME : trimmed;

  if (name.length > PROJECT_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Project name must be ${PROJECT_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, name };
}

export function resolveRenameName(rawName: unknown): NameValidationResult {
  if (typeof rawName !== "string") {
    return { ok: false, message: "Project name is required." };
  }

  const trimmed = rawName.trim();

  if (trimmed.length === 0) {
    return { ok: false, message: "Project name is required." };
  }

  if (trimmed.length > PROJECT_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Project name must be ${PROJECT_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, name: trimmed };
}

export interface UserProjects {
  owned: ProjectDto[];
  shared: ProjectDto[];
}

export async function getUserProjects(
  userId: string,
  email: string | null | undefined
): Promise<UserProjects> {
  const normalizedEmail = email?.trim().toLowerCase();

  const [owned, shared] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    }),
    normalizedEmail
      ? prisma.project.findMany({
          where: {
            ownerId: { not: userId },
            collaborators: { some: { email: normalizedEmail } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    owned: owned.map(toProjectDto),
    shared: shared.map(toProjectDto),
  };
}
