"use client"

import type { DragEvent } from "react"
import { Circle, Diamond, Hexagon, Pill as PillIcon, Square, Cylinder as CylinderIcon } from "lucide-react"

import { SHAPE_DEFAULT_SIZES, type CanvasNodeShape } from "@/types/canvas"

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

function handleDragStart(event: DragEvent<HTMLButtonElement>, shape: CanvasNodeShape) {
  const payload = JSON.stringify({ shape, size: SHAPE_DEFAULT_SIZES[shape] })
  event.dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, payload)
  event.dataTransfer.effectAllowed = "copy"
}

interface ShapePanelProps {
  onShapeCreate?: (shape: CanvasNodeShape) => void
}

export function ShapePanel({ onShapeCreate }: Readonly<ShapePanelProps>) {
  function handleShapeClick(shape: CanvasNodeShape) {
    onShapeCreate?.(shape)
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-3xl border border-surface-border bg-surface/90 p-2 shadow-lg backdrop-blur">
        {SHAPE_DEFINITIONS.map(({ shape, label, icon: Icon }) => (
          <button
            aria-label={`Add ${label} node`}
            className="flex h-10 w-10 cursor-grab items-center justify-center rounded-xl text-copy-secondary transition-colors hover:bg-subtle hover:text-copy-primary active:cursor-grabbing"
            draggable
            key={shape}
            onClick={() => handleShapeClick(shape)}
            onDragStart={(event) => handleDragStart(event, shape)}
            title={label}
            type="button"
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </div>
    </div>
  )
}
