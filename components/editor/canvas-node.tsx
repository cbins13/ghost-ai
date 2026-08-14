"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react"

import { useCanvasActions } from "@/components/editor/canvas"
import { NodeColorToolbar } from "@/components/editor/node-color-toolbar"
import { ShapeVisual } from "@/components/editor/shape-visual"
import { MIN_NODE_DIMENSION, type CanvasNode } from "@/types/canvas"

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export function CanvasNodeRenderer({ id, data, selected }: NodeProps<CanvasNode>) {
  const { updateNodeLabel, updateNodeColor } = useCanvasActions()
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState(data.label)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    }
  }, [isEditing])

  function startEditing() {
    setDraftLabel(data.label)
    setIsEditing(true)
  }

  function commitLabel() {
    setIsEditing(false)
    updateNodeLabel(id, draftLabel)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      commitLabel()
    }
  }

  return (
    <div className="group relative h-full w-full" onDoubleClick={startEditing}>
      <NodeResizer isVisible={selected} minHeight={MIN_NODE_DIMENSION} minWidth={MIN_NODE_DIMENSION} />
      {selected ? (
        <NodeColorToolbar
          activeColor={data.color}
          onSelect={(color) => updateNodeColor(id, color)}
        />
      ) : null}
      <ShapeVisual
        borderColor={selected ? "var(--accent-primary)" : "var(--border-subtle)"}
        borderWidth={selected ? 2 : 1.5}
        fill={data.color}
        shape={data.shape}
      />
      {HANDLE_POSITIONS.map((position) => (
        <Handle
          className="!h-2.5 !w-2.5 !border-2 !border-[var(--bg-base)] !bg-[var(--text-primary)] opacity-0 transition-opacity group-hover:opacity-100"
          id={position}
          key={position}
          position={position}
          type="source"
        />
      ))}
      {isEditing ? (
        <div className="absolute inset-0 flex items-center justify-center px-3 py-2">
          <textarea
            className="nodrag nopan h-full w-full resize-none bg-transparent text-center text-sm outline-none"
            onBlur={commitLabel}
            onChange={(event) => setDraftLabel(event.target.value)}
            onKeyDown={handleKeyDown}
            ref={textareaRef}
            style={{ color: data.textColor }}
            value={draftLabel}
          />
        </div>
      ) : (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 py-2 text-center text-sm"
          style={{ color: data.label ? data.textColor : "var(--text-faint)" }}
        >
          <span className="truncate">{data.label || "Double-click to edit"}</span>
        </div>
      )}
    </div>
  )
}
