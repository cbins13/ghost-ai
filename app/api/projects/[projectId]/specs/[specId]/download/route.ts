import { forbidden, internalError, notFound, unauthorized } from "@/lib/api-response"
import { readSpecBlob } from "@/lib/spec-storage"
import { getCurrentIdentity, getProjectWithAccess } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ projectId: string; specId: string }>
}

function sanitizeFilename(name: string, fallback: string): string {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9._-]/g, "_")
  return cleaned.length > 0 ? cleaned : fallback
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { projectId, specId } = await params
  const identity = await getCurrentIdentity()

  if (!identity) {
    return unauthorized()
  }

  const project = await getProjectWithAccess(projectId, identity)

  if (!project) {
    const exists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
    return exists ? forbidden() : notFound()
  }

  const spec = await prisma.projectSpec.findUnique({ where: { id: specId } })

  if (!spec || spec.projectId !== projectId) {
    return notFound("The requested spec could not be found.")
  }

  try {
    const content = await readSpecBlob(spec.filePath)
    const filename = sanitizeFilename(spec.filename, `spec-${spec.id}.md`)

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error(`Failed to load spec blob for project ${projectId}, spec ${specId}:`, error)
    return internalError("Failed to load the spec file.")
  }
}
