import { NextResponse } from "next/server"

import { forbidden, notFound, unauthorized } from "@/lib/api-response"
import { getCurrentIdentity, getProjectWithAccess } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { projectId } = await params
  const identity = await getCurrentIdentity()

  if (!identity) {
    return unauthorized()
  }

  const project = await getProjectWithAccess(projectId, identity)

  if (!project) {
    const exists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
    return exists ? forbidden() : notFound()
  }

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    select: { id: true, filename: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ specs })
}
