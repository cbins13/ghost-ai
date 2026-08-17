"use client"

import { MousePointer2 } from "lucide-react"
import { useOthers } from "@liveblocks/react"
import type { ReactFlowInstance } from "@xyflow/react"

import type { CanvasNode } from "@/types/canvas"

interface LiveCursorsProps {
  reactFlowInstance: ReactFlowInstance<CanvasNode>
}

export function LiveCursors({ reactFlowInstance }: Readonly<LiveCursorsProps>) {
  const others = useOthers()

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {others.map((other) => {
        if (!other.presence.cursor) {
          return null
        }

        const { x, y } = reactFlowInstance.flowToScreenPosition(other.presence.cursor)

        return (
          <div
            className="absolute top-0 left-0"
            key={other.connectionId}
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            <MousePointer2 className="h-5 w-5 -translate-x-0.5 -translate-y-0.5" fill={other.info.color} stroke={other.info.color} />
            <span
              className="ml-3 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap text-white"
              style={{ backgroundColor: other.info.color }}
            >
              {other.info.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
