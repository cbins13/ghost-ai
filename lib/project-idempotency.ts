import { NextResponse } from "next/server"

import { conflict } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"

export type ProjectMutationOperation = "create" | "rename" | "delete"

export function getIdempotencyKey(request: Request) {
  return request.headers.get("Idempotency-Key")?.trim() || null
}

export function createRequestFingerprint(
  operation: ProjectMutationOperation,
  projectId?: string,
  name?: string
) {
  return JSON.stringify({ name: name ?? null, operation, projectId: projectId ?? null })
}

export async function getIdempotentResponse(
  userId: string,
  idempotencyKey: string | null,
  operation: ProjectMutationOperation,
  requestFingerprint: string,
  projectId?: string
) {
  if (!idempotencyKey) {
    return null
  }

  const mutation = await prisma.projectMutation.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
  })

  if (!mutation) {
    return null
  }

  if (
    mutation.operation !== operation ||
    mutation.projectId !== projectId ||
    mutation.requestFingerprint !== requestFingerprint
  ) {
    return conflict("This idempotency key was already used for a different project mutation.")
  }

  return mutation.responseBody === null
    ? new NextResponse(null, { status: mutation.responseStatus })
    : NextResponse.json(mutation.responseBody, { status: mutation.responseStatus })
}