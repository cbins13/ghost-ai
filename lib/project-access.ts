import { auth, currentUser } from "@clerk/nextjs/server"

import type { Project } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export interface CurrentIdentity {
  userId: string
  email: string | null
}

export function getVerifiedPrimaryEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  const primaryEmail = user?.primaryEmailAddress

  return primaryEmail?.verification?.status === "verified" ? primaryEmail.emailAddress : null
}

export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const user = await currentUser()

  return { userId, email: getVerifiedPrimaryEmail(user) }
}

export async function getProjectWithAccess(
  projectId: string,
  identity: CurrentIdentity
): Promise<Project | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId } })

  if (!project) {
    return null
  }

  if (project.ownerId === identity.userId) {
    return project
  }

  const normalizedEmail = identity.email?.trim().toLowerCase()

  if (!normalizedEmail) {
    return null
  }

  const collaborator = await prisma.projectCollaborator.findUnique({
    where: { projectId_email: { projectId, email: normalizedEmail } },
  })

  return collaborator ? project : null
}
