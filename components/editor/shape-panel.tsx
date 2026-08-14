"use client"

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react"
import { Circle, Diamond, Hexagon, Pill as PillIcon, Square, Cylinder as CylinderIcon } from "lucide-react"

import { useCanvasActions } from "@/components/editor/canvas"
import { ShapeVisual } from "@/components/editor/shape-visual"
import { DEFAULT_NODE_COLOR, SHAPE_DEFAULT_SIZES, type CanvasNodeShape } from "@/types/canvas"

export const SHAPE_DRAG_MIME_TYPE = "application/x-ghostai-shape"

interface ShapeDefinition {
  icon: typeof Square
  label: string
  shape: CanvasNodeShape
}

const SHAPE_DEFINITIONS: ShapeDefinition[] = [
  { shape: "rectangle", label: "Rectangle", icon: Square },
  { shape: "diamond", label: "Diamond", icon: Diamond },
  { shape: "circle", label: "Circle", icon: Circle },
  { shape: "pill", label: "Pill", icon: PillIcon },
  { shape: "cylinder", label: "Cylinder", icon: CylinderIcon },
  { shape: "hexagon", label: "Hexagon", icon: Hexagon },
]

interface DragPreviewState {
  shape: CanvasNodeShape
  x: number
  y: number
}

export function ShapePanel() {
  const { createNodeAtCenter } = useCanvasActions()
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null)
  const emptyDragImageRef = useRef<HTMLDivElement>(null)

  function handleDragStart(event: DragEvent<HTMLButtonElement>, shape: CanvasNodeShape) {
    const payload = JSON.stringify({ shape, size: SHAPE_DEFAULT_SIZES[shape] })
    event.dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, payload)
    event.dataTransfer.effectAllowed = "copy"

    if (emptyDragImageRef.current) {
      event.dataTransfer.setDragImage(emptyDragImageRef.current, 0, 0)
    }

    setDragPreview({ shape, x: event.clientX, y: event.clientY })
  }

  function handleDrag(event: DragEvent<HTMLButtonElement>) {
    if (event.clientX === 0 && event.clientY === 0) {
      return
    }

    setDragPreview((previous) => (previous ? { ...previous, x: event.clientX, y: event.clientY } : previous))
  }

  function handleDragEnd() {
    setDragPreview(null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, shape: CanvasNodeShape) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      createNodeAtCenter(shape)
    }
  }

  function handleClick(shape: CanvasNodeShape) {
    createNodeAtCenter(shape)
  }

  const previewSize = dragPreview ? SHAPE_DEFAULT_SIZES[dragPreview.shape] : null

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-3xl border border-surface-border bg-surface/90 p-2 shadow-lg backdrop-blur">
          {SHAPE_DEFINITIONS.map(({ shape, label, icon: Icon }) => (
            <button
              aria-label={`Add ${label} node`}
              className="flex h-10 w-10 cursor-grab items-center justify-center rounded-xl text-copy-secondary transition-colors hover:bg-subtle hover:text-copy-primary active:cursor-grabbing"
              draggable
              key={shape}
              onClick={() => handleClick(shape)}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              onDragStart={(event) => handleDragStart(event, shape)}
              onKeyDown={(event) => handleKeyDown(event, shape)}
              title={label}
              type="button"
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>
      <div className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0" ref={emptyDragImageRef} />
      {dragPreview && previewSize && (
        <div
          className="pointer-events-none fixed z-50 opacity-80"
          style={{
            left: dragPreview.x,
            top: dragPreview.y,
            width: previewSize.width,
            height: previewSize.height,
            transform: "translate(-50%, -50%)",
          }}
        >
          <ShapeVisual
            borderColor="var(--accent-primary)"
            borderWidth={2}
            fill={DEFAULT_NODE_COLOR.fill}
            shape={dragPreview.shape}
          />
        </div>
      )}
    </>
  )
}
