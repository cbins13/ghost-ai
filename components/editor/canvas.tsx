"use client"

import { Component, createContext, useCallback, useContext, useState, type DragEvent, type ReactNode } from "react"
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useRedo,
  useRoom,
  useUndo,
} from "@liveblocks/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type DefaultEdgeOptions,
  type EdgeTypes,
  type NodeTypes,
} from "@xyflow/react"

import "@xyflow/react/dist/style.css"

import { CanvasControlBar } from "@/components/editor/canvas-control-bar"
import { CanvasEdgeRenderer, EDGE_COLOR } from "@/components/editor/canvas-edge"
import { CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { SHAPE_DRAG_MIME_TYPE, ShapePanel } from "@/components/editor/shape-panel"
import { resolveTemplateColor, type CanvasTemplate } from "@/components/editor/starter-templates"
import { StarterTemplatesImportDialog } from "@/components/editor/starter-templates-import-dialog"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import {
  DEFAULT_NODE_COLOR,
  MAX_NODE_DIMENSION,
  MIN_NODE_DIMENSION,
  NODE_SHAPES,
  SHAPE_DEFAULT_SIZES,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeColor,
  type CanvasNodeShape,
} from "@/types/canvas"

interface CanvasProps {
  roomId: string
  isTemplatesModalOpen: boolean
  onTemplatesModalOpenChange: (open: boolean) => void
}

const nodeTypes: NodeTypes = {
  canvasNode: CanvasNodeRenderer,
}

const edgeTypes: EdgeTypes = {
  canvasEdge: CanvasEdgeRenderer,
}

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "canvasEdge",
  markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
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
  updateNodeLabel: (nodeId: string, label: string) => void
  updateNodeColor: (nodeId: string, color: CanvasNodeColor) => void
  updateEdgeLabel: (edgeId: string, label?: string) => void
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

function snapshotSignature(nodes: CanvasNode[], edges: CanvasEdge[]): string {
  const nodeSignature = nodes
    .map((n) => `${n.id}:${n.position.x},${n.position.y}:${JSON.stringify(n.data)}`)
    .sort()
    .join("|")
  const edgeSignature = edges
    .map((e) => `${e.id}:${e.source}-${e.target}:${JSON.stringify(e.data)}`)
    .sort()
    .join("|")
  return `${nodeSignature}::${edgeSignature}`
}

interface CanvasFlowProps {
  isTemplatesModalOpen: boolean
  onTemplatesModalOpenChange: (open: boolean) => void
}

function CanvasFlow({ isTemplatesModalOpen, onTemplatesModalOpenChange }: Readonly<CanvasFlowProps>) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } = useLiveblocksFlow<
    CanvasNode,
    CanvasEdge
  >({
    nodes: { initial: [] },
    edges: { initial: [] },
    suspense: true,
  })
  const reactFlowInstance = useReactFlow<CanvasNode>()
  const { screenToFlowPosition, getViewport, fitView } = reactFlowInstance
  const room = useRoom()
  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  const [pendingTemplate, setPendingTemplate] = useState<CanvasTemplate | null>(null)
  const [pendingSnapshot, setPendingSnapshot] = useState<string | null>(null)
  const [hasConflict, setHasConflict] = useState(false)

  const applyTemplate = useCallback(
    (template: CanvasTemplate) => {
      const idMap = new Map(template.nodes.map((templateNode) => [templateNode.id, crypto.randomUUID()]))

      const newNodes: CanvasNode[] = template.nodes.map((templateNode) => {
        const color = resolveTemplateColor(templateNode.color)
        const size = templateNode.size ?? SHAPE_DEFAULT_SIZES[templateNode.shape]
        return {
          id: idMap.get(templateNode.id)!,
          type: "canvasNode",
          position: templateNode.position,
          width: size.width,
          height: size.height,
          data: {
            label: templateNode.label,
            color: color.fill,
            textColor: color.text,
            shape: templateNode.shape,
          },
        }
      })

      const newEdges: CanvasEdge[] = template.edges.map((templateEdge) => ({
        id: crypto.randomUUID(),
        type: "canvasEdge",
        source: idMap.get(templateEdge.source)!,
        target: idMap.get(templateEdge.target)!,
        data: { label: templateEdge.label },
      }))

      room.batch(() => {
        onNodesChange([
          ...nodes.map((existing) => ({ type: "remove" as const, id: existing.id })),
          ...newNodes.map((item) => ({ type: "add" as const, item })),
        ])
        onEdgesChange([
          ...edges.map((existing) => ({ type: "remove" as const, id: existing.id })),
          ...newEdges.map((item) => ({ type: "add" as const, item })),
        ])
      })

      window.requestAnimationFrame(() => fitView({ duration: 200 }))
    },
    [edges, fitView, nodes, onEdgesChange, onNodesChange, room]
  )

  const requestImport = useCallback(
    (template: CanvasTemplate) => {
      if (nodes.length === 0 && edges.length === 0) {
        applyTemplate(template)
        return
      }

      setPendingTemplate(template)
      setPendingSnapshot(snapshotSignature(nodes, edges))
      setHasConflict(false)
    },
    [applyTemplate, edges, nodes]
  )

  const confirmImport = useCallback(() => {
    if (!pendingTemplate) {
      return
    }

    if (snapshotSignature(nodes, edges) !== pendingSnapshot) {
      setHasConflict(true)
      return
    }

    applyTemplate(pendingTemplate)
    setPendingTemplate(null)
    setPendingSnapshot(null)
    setHasConflict(false)
  }, [applyTemplate, edges, nodes, pendingSnapshot, pendingTemplate])

  const retryImport = useCallback(() => {
    setPendingSnapshot(snapshotSignature(nodes, edges))
    setHasConflict(false)
  }, [edges, nodes])

  const cancelImport = useCallback(() => {
    setPendingTemplate(null)
    setPendingSnapshot(null)
    setHasConflict(false)
  }, [])

  useKeyboardShortcuts({ reactFlowInstance, onUndo: undo, onRedo: redo })

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

  const updateNodeLabel = useCallback(
    (nodeId: string, label: string) => {
      const node = nodes.find((candidate) => candidate.id === nodeId)

      if (!node) {
        return
      }

      onNodesChange([{ type: "replace", id: nodeId, item: { ...node, data: { ...node.data, label } } }])
    },
    [nodes, onNodesChange],
  )

  const updateNodeColor = useCallback(
    (nodeId: string, color: CanvasNodeColor) => {
      const node = nodes.find((candidate) => candidate.id === nodeId)

      if (!node) {
        return
      }

      onNodesChange([
        {
          type: "replace",
          id: nodeId,
          item: { ...node, data: { ...node.data, color: color.fill, textColor: color.text } },
        },
      ])
    },
    [nodes, onNodesChange],
  )

  const updateEdgeLabel = useCallback(
    (edgeId: string, label?: string) => {
      const edge = edges.find((candidate) => candidate.id === edgeId)

      if (!edge) {
        return
      }

      onEdgesChange([{ type: "replace", id: edgeId, item: { ...edge, data: { ...edge.data, label } } }])
    },
    [edges, onEdgesChange],
  )

  const canvasActions = useCallback(
    () => ({ createNodeAtCenter, updateNodeLabel, updateNodeColor, updateEdgeLabel }),
    [createNodeAtCenter, updateNodeLabel, updateNodeColor, updateEdgeLabel],
  )

  return (
    <CanvasActionsContext.Provider value={canvasActions()}>
      <div className="relative flex flex-1" onDragOver={handleDragOver} onDrop={handleDrop}>
        <ReactFlow
          connectionMode={ConnectionMode.Loose}
          defaultEdgeOptions={defaultEdgeOptions}
          edges={edges}
          edgeTypes={edgeTypes}
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
        <CanvasControlBar
          canRedo={canRedo}
          canUndo={canUndo}
          onRedo={redo}
          onUndo={undo}
          reactFlowInstance={reactFlowInstance}
        />
      </div>
      <StarterTemplatesModal
        isOpen={isTemplatesModalOpen}
        onImport={requestImport}
        onOpenChange={onTemplatesModalOpenChange}
      />
      <StarterTemplatesImportDialog
        hasConflict={hasConflict}
        onCancel={cancelImport}
        onConfirm={confirmImport}
        onRetry={retryImport}
        template={pendingTemplate}
      />
    </CanvasActionsContext.Provider>
  )
}

export function Canvas({ roomId, isTemplatesModalOpen, onTemplatesModalOpenChange }: Readonly<CanvasProps>) {
  return (
    <CanvasErrorBoundary>
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <RoomProvider id={roomId} initialPresence={{ cursor: null, isThinking: false }}>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <ReactFlowProvider>
              <CanvasFlow
                isTemplatesModalOpen={isTemplatesModalOpen}
                onTemplatesModalOpenChange={onTemplatesModalOpenChange}
              />
            </ReactFlowProvider>
          </ClientSideSuspense>
        </RoomProvider>
      </LiveblocksProvider>
    </CanvasErrorBoundary>
  )
}
