import type { CanvasState } from "@/lib/canvas-storage"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidNode(value: unknown): boolean {
  if (!isPlainObject(value)) {
    return false
  }

  const { id, type, position, data } = value

  if (typeof id !== "string" || type !== "canvasNode") {
    return false
  }

  if (!isPlainObject(position) || typeof position.x !== "number" || typeof position.y !== "number") {
    return false
  }

  return isPlainObject(data)
}

function isValidEdge(value: unknown): boolean {
  if (!isPlainObject(value)) {
    return false
  }

  const { id, type, source, target } = value

  return (
    typeof id === "string" &&
    (type === undefined || type === "canvasEdge") &&
    typeof source === "string" &&
    typeof target === "string"
  )
}

export function parseCanvasState(value: unknown): CanvasState | null {
  if (!isPlainObject(value)) {
    return null
  }

  const { nodes, edges } = value

  if (!Array.isArray(nodes) || !nodes.every(isValidNode)) {
    return null
  }

  if (!Array.isArray(edges) || !edges.every(isValidEdge)) {
    return null
  }

  const normalizedEdges = edges.map((edge) => ({ ...(edge as Record<string, unknown>), type: "canvasEdge" }))

  return { nodes, edges: normalizedEdges } as CanvasState
}
