import type { Edge, Node } from "@xyflow/react"

export type CanvasNodeShape = "rectangle" | "diamond" | "circle" | "pill" | "cylinder" | "hexagon"

export interface CanvasNodeColor {
  fill: string
  text: string
}

export const NODE_COLORS: CanvasNodeColor[] = [
  { fill: "#1F1F1F", text: "#EDEDED" },
  { fill: "#10233D", text: "#52A8FF" },
  { fill: "#2E1938", text: "#BF7AF0" },
  { fill: "#331B00", text: "#FF990A" },
  { fill: "#3C1618", text: "#FF6166" },
  { fill: "#3A1726", text: "#F75F8F" },
  { fill: "#0F2E18", text: "#62C073" },
  { fill: "#062822", text: "#0AC7B4" },
]

export const DEFAULT_NODE_COLOR = NODE_COLORS[0]

export const NODE_SHAPES: CanvasNodeShape[] = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
]

export interface CanvasNodeSize {
  height: number
  width: number
}

export const SHAPE_DEFAULT_SIZES: Record<CanvasNodeShape, CanvasNodeSize> = {
  rectangle: { width: 160, height: 80 },
  diamond: { width: 160, height: 160 },
  circle: { width: 100, height: 100 },
  pill: { width: 160, height: 60 },
  cylinder: { width: 120, height: 100 },
  hexagon: { width: 140, height: 100 },
}

export const MIN_NODE_DIMENSION = 40
export const MAX_NODE_DIMENSION = 600

export interface CanvasNodeData extends Record<string, unknown> {
  label: string
  color: string
  textColor: string
  shape: CanvasNodeShape
}

export interface CanvasEdgeData extends Record<string, unknown> {
  label?: string
}

export type CanvasNode = Node<CanvasNodeData, "canvasNode">
export type CanvasEdge = Edge<CanvasEdgeData, "canvasEdge">
