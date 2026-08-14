"use client"

import { Component, createContext, useCallback, useContext, type DragEvent, type ReactNode } from "react"
import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react"

import "@xyflow/react/dist/style.css"

import { CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { SHAPE_DRAG_MIME_TYPE, ShapePanel } from "@/components/editor/shape-panel"
import {
  DEFAULT_NODE_COLOR,
  MAX_NODE_DIMENSION,
  MIN_NODE_DIMENSION,
  NODE_SHAPES,
  SHAPE_DEFAULT_SIZES,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeShape,
} from "@/types/canvas"

interface CanvasProps {
  roomId: string
}

const nodeTypes: NodeTypes = {
  canvasNode: CanvasNodeRenderer,
}

function CanvasLoading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-base">
      <p className="text-sm text-copy-muted">Loading canvas…</p>
    </div>
  )
}

function CanvasConnectionError() {
  return (
    <div className="flex flex-1 items-center justify-center bg-base">
      <p className="text-sm text-copy-muted">
        Couldn&apos;t connect to the collaborative canvas. Please refresh to try again.
      </p>
    </div>
  )
}

interface CanvasErrorBoundaryState {
  hasError: boolean
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, CanvasErrorBoundaryState> {
  state: CanvasErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <CanvasConnectionError />
    }

    return this.props.children
  }
}

function isCanvasNodeShape(value: unknown): value is CanvasNodeShape {
  return typeof value === "string" && (NODE_SHAPES as string[]).includes(value)
}

interface CanvasActionsContextValue {
  createNodeAtCenter: (shape: CanvasNodeShape) => void
}

const CanvasActionsContext = createContext<CanvasActionsContextValue | null>(null)

export function useCanvasActions() {
  const context = useContext(CanvasActionsContext)
  if (!context) {
    throw new Error("useCanvasActions must be used within CanvasFlow")
  }
  return context
}

function clampDimension(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(MAX_NODE_DIMENSION, Math.max(MIN_NODE_DIMENSION, value))
}

interface ShapeDragPayload {
  shape: CanvasNodeShape
  size: { height: number; width: number }
}

function parseShapeDragPayload(raw: string): ShapeDragPayload | null {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null
  }

  const { shape, size } = parsed as Record<string, unknown>

  if (!isCanvasNodeShape(shape)) {
    return null
  }

  if (typeof size !== "object" || size === null) {
    return null
  }

  const { width, height } = size as Record<string, unknown>

  if (typeof width !== "number" || !Number.isFinite(width)) {
    return null
  }

  if (typeof height !== "number" || !Number.isFinite(height)) {
    return null
  }

  return {
    shape,
    size: {
      width: clampDimension(width, MIN_NODE_DIMENSION),
      height: clampDimension(height, MIN_NODE_DIMENSION),
    },
  }
}

function CanvasFlow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } = useLiveblocksFlow<
    CanvasNode,
    CanvasEdge
  >({
    nodes: { initial: [] },
    edges: { initial: [] },
    suspense: true,
  })
  const { screenToFlowPosition, getViewport } = useReactFlow<CanvasNode>()

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes(SHAPE_DRAG_MIME_TYPE)) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  const createNodeAtCenter = useCallback(
    (shape: CanvasNodeShape) => {
      const viewport = getViewport()
      const size = SHAPE_DEFAULT_SIZES[shape]

      const centerPosition = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })

      const newNode: CanvasNode = {
        id: crypto.randomUUID(),
        type: "canvasNode",
        position: {
          x: centerPosition.x - size.width / 2,
          y: centerPosition.y - size.height / 2,
        },
        width: size.width,
        height: size.height,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR.fill,
          textColor: DEFAULT_NODE_COLOR.text,
          shape,
        },
      }

      onNodesChange([{ type: "add", item: newNode }])
    },
    [getViewport, onNodesChange, screenToFlowPosition],
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const raw = event.dataTransfer.getData(SHAPE_DRAG_MIME_TYPE)

      if (!raw) {
        return
      }

      event.preventDefault()

      const payload = parseShapeDragPayload(raw)

      if (!payload) {
        return
      }

      const dropPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY })

      const newNode: CanvasNode = {
        id: crypto.randomUUID(),
        type: "canvasNode",
        position: {
          x: dropPosition.x - payload.size.width / 2,
          y: dropPosition.y - payload.size.height / 2,
        },
        width: payload.size.width,
        height: payload.size.height,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR.fill,
          textColor: DEFAULT_NODE_COLOR.text,
          shape: payload.shape,
        },
      }

      onNodesChange([{ type: "add", item: newNode }])
    },
    [onNodesChange, screenToFlowPosition],
  )

  const canvasActions = useCallback(() => ({ createNodeAtCenter }), [createNodeAtCenter])

  return (
    <CanvasActionsContext.Provider value={canvasActions()}>
      <div className="relative flex flex-1" onDragOver={handleDragOver} onDrop={handleDrop}>
        <ReactFlow
          connectionMode={ConnectionMode.Loose}
          edges={edges}
          fitView
          nodes={nodes}
          nodeTypes={nodeTypes}
          onConnect={onConnect}
          onDelete={onDelete}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
        >
          <Background variant={BackgroundVariant.Dots} />
          <MiniMap />
        </ReactFlow>
        <ShapePanel />
      </div>
    </CanvasActionsContext.Provider>
  )
}

export function Canvas({ roomId }: Readonly<CanvasProps>) {
  return (
    <CanvasErrorBoundary>
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <RoomProvider id={roomId} initialPresence={{ cursor: null, isThinking: false }}>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <ReactFlowProvider>
              <CanvasFlow />
            </ReactFlowProvider>
          </ClientSideSuspense>
        </RoomProvider>
      </LiveblocksProvider>
    </CanvasErrorBoundary>
  )
}
