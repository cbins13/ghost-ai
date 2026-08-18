import type { CanvasState } from "@/lib/canvas-storage"
import { MAX_NODE_DIMENSION, MIN_NODE_DIMENSION } from "@/types/canvas"

const MAX_CANVAS_NODES = 500
const MAX_CANVAS_EDGES = 1_000
const MAX_NODE_LABEL_LENGTH = 1_000

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

  if (
    !isPlainObject(position) ||
    typeof position.x !== "number" ||
    !Number.isFinite(position.x) ||
    typeof position.y !== "number" ||
    !Number.isFinite(position.y)
  ) {
    return false
  }

  if (!isPlainObject(data)) {
    return false
  }

  const { label, color, textColor, shape } = data

  return (
    typeof label === "string" &&
    label.length <= MAX_NODE_LABEL_LENGTH &&
    typeof color === "string" &&
    typeof textColor === "string" &&
    typeof shape === "string" &&
    typeof value.width === "number" &&
    Number.isFinite(value.width) &&
    value.width >= MIN_NODE_DIMENSION &&
    value.width <= MAX_NODE_DIMENSION &&
    typeof value.height === "number" &&
    Number.isFinite(value.height) &&
    value.height >= MIN_NODE_DIMENSION &&
    value.height <= MAX_NODE_DIMENSION
  )
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

  if (!Array.isArray(nodes) || nodes.length > MAX_CANVAS_NODES || !nodes.every(isValidNode)) {
    return null
  }

  if (!Array.isArray(edges) || edges.length > MAX_CANVAS_EDGES || !edges.every(isValidEdge)) {
    return null
  }

  const normalizedEdges = edges.map((edge) => ({ ...(edge as Record<string, unknown>), type: "canvasEdge" }))

  return { nodes, edges: normalizedEdges } as CanvasState
}
