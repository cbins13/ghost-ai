"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"

import type { CanvasNode } from "@/types/canvas"

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export function CanvasNodeRenderer({ data }: NodeProps<CanvasNode>) {
  return (
    <div
      className="group flex h-full w-full items-center justify-center rounded-xl border px-3 py-2 text-center text-sm"
      style={{ backgroundColor: data.color, borderColor: data.color, color: data.textColor }}
    >
      {HANDLE_POSITIONS.map((position) => (
        <Handle
          className="!h-2 !w-2 !border-none !bg-copy-primary opacity-0 transition-opacity group-hover:opacity-100"
          id={position}
          key={position}
          position={position}
          type="source"
        />
      ))}
      <span className="truncate">{data.label}</span>
    </div>
  )
}
