import { get, put } from "@vercel/blob"

import type { CanvasNode, CanvasEdge } from "@/types/canvas"

export interface CanvasState {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export const EMPTY_CANVAS_STATE: CanvasState = { nodes: [], edges: [] }

function canvasBlobPathname(projectId: string, revision: number): string {
  return `canvas/${projectId}/${revision}-${crypto.randomUUID()}.json`
}

export async function writeCanvasBlob(
  projectId: string,
  revision: number,
  canvas: CanvasState
): Promise<string> {
  const blob = await put(canvasBlobPathname(projectId, revision), JSON.stringify(canvas), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
  })

  return blob.pathname
}

export async function readCanvasBlob(pathname: string): Promise<CanvasState> {
  const result = await get(pathname, { access: "private", useCache: false })

  if (!result || result.statusCode !== 200) {
    throw new Error(`Canvas blob ${pathname} could not be read.`)
  }

  const response = new Response(result.stream)
  return (await response.json()) as CanvasState
}
