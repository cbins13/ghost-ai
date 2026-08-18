import { del, get, put } from "@vercel/blob"

import type { ProjectSpec } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"

function specBlobPathname(projectId: string, idempotencyKey: string): string {
  return `specs/${projectId}/${idempotencyKey}.md`
}

export async function writeSpecBlob(
  projectId: string,
  idempotencyKey: string,
  content: string
): Promise<string> {
  const blob = await put(specBlobPathname(projectId, idempotencyKey), content, {
    access: "private",
    contentType: "text/markdown",
    addRandomSuffix: false,
  })

  return blob.pathname
}

export async function readSpecBlob(pathname: string): Promise<string> {
  const result = await get(pathname, { access: "private", useCache: false })

  if (!result || result.statusCode !== 200) {
    throw new Error(`Spec blob ${pathname} could not be read.`)
  }

  const response = new Response(result.stream)
  return await response.text()
}

/**
 * Uploads the spec content and records its metadata, reusing the existing
 * record/blob when a spec was already persisted for this idempotency key
 * (e.g. a retried run). If the metadata write fails after the blob upload
 * succeeds, the orphaned blob is cleaned up.
 */
export async function saveGeneratedSpec(
  projectId: string,
  idempotencyKey: string,
  filename: string,
  content: string
): Promise<ProjectSpec> {
  const existing = await prisma.projectSpec.findUnique({ where: { idempotencyKey } })

  if (existing) {
    return existing
  }

  const filePath = await writeSpecBlob(projectId, idempotencyKey, content)

  try {
    return await prisma.projectSpec.create({
      data: { projectId, filePath, filename, idempotencyKey },
    })
  } catch (error) {
    await del(filePath).catch(() => {})

    const raceWinner = await prisma.projectSpec.findUnique({ where: { idempotencyKey } })

    if (raceWinner) {
      return raceWinner
    }

    throw error
  }
}
