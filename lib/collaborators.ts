import { clerkClient } from "@clerk/nextjs/server";

import type { ProjectCollaborator } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_COLLABORATORS_PER_LOOKUP = 100;

export interface CollaboratorDto {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function enrichCollaborators(collaborators: ProjectCollaborator[]): Promise<CollaboratorDto[]> {
  if (collaborators.length === 0) {
    return [];
  }

  const emails = collaborators.map((collaborator) => normalizeEmail(collaborator.email));
  const client = await clerkClient();

  const profilesByEmail = new Map<string, { name: string | null; avatarUrl: string | null }>();

  try {
    const userBatches = await Promise.all(
      Array.from({ length: Math.ceil(emails.length / MAX_COLLABORATORS_PER_LOOKUP) }, (_, index) => {
        const emailAddress = emails.slice(
          index * MAX_COLLABORATORS_PER_LOOKUP,
          (index + 1) * MAX_COLLABORATORS_PER_LOOKUP
        );

        return client.users.getUserList({ emailAddress, limit: emailAddress.length });
      })
    );

    for (const { data: users } of userBatches) {
      for (const user of users) {
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || null;

        for (const address of user.emailAddresses) {
          profilesByEmail.set(normalizeEmail(address.emailAddress), {
            name,
            avatarUrl: user.imageUrl || null,
          });
        }
      }
    }
  } catch {
    // If Clerk lookup fails, fall back to email-only display for all collaborators.
  }

  return collaborators.map((collaborator) => {
    const profile = profilesByEmail.get(normalizeEmail(collaborator.email));

    return {
      id: collaborator.id,
      email: collaborator.email,
      name: profile?.name ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      createdAt: collaborator.createdAt.toISOString(),
    };
  });
}

export async function getEnrichedCollaborators(projectId: string): Promise<CollaboratorDto[]> {
  const collaborators = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  return enrichCollaborators(collaborators);
}
