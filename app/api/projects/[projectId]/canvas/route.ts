import { forbidden, internalError, notFound, unauthorized } from "@/lib/api-response"
import { EMPTY_CANVAS_STATE, readCanvasBlob, writeCanvasBlob } from "@/lib/canvas-storage"
import { parseCanvasState } from "@/lib/canvas-validation"
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
    return forbidden()
  }

  if (!project.canvasJsonPath) {
    return Response.json({ canvas: EMPTY_CANVAS_STATE, revision: project.canvasRevision })
  }

  try {
    const canvas = await readCanvasBlob(project.canvasJsonPath)
    return Response.json({ canvas, revision: project.canvasRevision })
  } catch (error) {
    console.error(`Failed to load canvas blob for project ${projectId}:`, error)
    return internalError("Failed to load the saved canvas.")
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { projectId } = await params
  const identity = await getCurrentIdentity()

  if (!identity) {
    return unauthorized()
  }

  const project = await getProjectWithAccess(projectId, identity)

  if (!project) {
    return forbidden()
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON body." } }, { status: 400 })
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request body." } }, { status: 400 })
  }

  const { canvas: canvasInput, revision: clientRevision } = body as Record<string, unknown>

  const canvas = parseCanvasState(canvasInput)

  if (!canvas || typeof clientRevision !== "number" || !Number.isInteger(clientRevision) || clientRevision < 0) {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid canvas payload." } }, { status: 400 })
  }

  try {
    const nextRevision = clientRevision + 1
    const blobPathname = await writeCanvasBlob(projectId, nextRevision, canvas)

    const { count } = await prisma.project.updateMany({
      where: { id: projectId, canvasRevision: clientRevision },
      data: { canvasJsonPath: blobPathname, canvasRevision: nextRevision },
    })

    if (count === 0) {
      const current = await prisma.project.findUnique({ where: { id: projectId } })

      if (!current) {
        return notFound()
      }

      const authoritativeCanvas = current.canvasJsonPath
        ? await readCanvasBlob(current.canvasJsonPath)
        : EMPTY_CANVAS_STATE

      return Response.json(
        { canvas: authoritativeCanvas, revision: current.canvasRevision },
        { status: 409 }
      )
    }

    return Response.json({ canvas, revision: nextRevision })
  } catch (error) {
    console.error(`Failed to save canvas for project ${projectId}:`, error)
    return internalError("Failed to save the canvas.")
  }
}
