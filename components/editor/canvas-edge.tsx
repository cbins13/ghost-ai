"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react"

import { useCanvasActions } from "@/components/editor/canvas"
import type { CanvasEdge } from "@/types/canvas"

export const EDGE_COLOR = "#f8fafc"

export function CanvasEdgeRenderer({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps<CanvasEdge>) {
  const { updateEdgeLabel } = useCanvasActions()
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  })

  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState(data?.label ?? "")
  const inputRef = useRef<HTMLInputElement>(null)

  const label = data?.label
  const isActive = selected || isHovered || isEditing

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  function startEditing() {
    setDraftLabel(label ?? "")
    setIsEditing(true)
  }

  function commitLabel() {
    setIsEditing(false)
    updateEdgeLabel(id, draftLabel.trim() || undefined)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      commitLabel()
    } else if (event.key === "Escape") {
      event.preventDefault()
      setIsEditing(false)
      setDraftLabel(label ?? "")
    }
  }

  return (
    <>
      <path
        className="cursor-pointer"
        d={path}
        fill="none"
        onDoubleClick={startEditing}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        stroke="transparent"
        strokeWidth={20}
      />
      <BaseEdge
        markerEnd={markerEnd}
        path={path}
        style={{
          stroke: EDGE_COLOR,
          strokeWidth: 1.5,
          strokeLinecap: "round",
          opacity: isActive ? 1 : 0.55,
          transition: "opacity 150ms ease",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute"
          onDoubleClick={startEditing}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          {isEditing ? (
            <input
              className="rounded-full border border-surface-border bg-surface-elevated px-2 py-0.5 text-center text-xs text-copy-primary outline-none focus:border-brand"
              onBlur={commitLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              style={{ width: `${Math.max(draftLabel.length, 1) + 1}ch` }}
              value={draftLabel}
            />
          ) : label ? (
            <span className="rounded-full border border-surface-border bg-surface-elevated px-2 py-0.5 text-xs text-copy-primary">
              {label}
            </span>
          ) : isActive ? (
            <span className="rounded-full border border-dashed border-surface-border px-2 py-0.5 text-xs text-copy-faint">
              Add label
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
