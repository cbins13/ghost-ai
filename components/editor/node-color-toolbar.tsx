"use client"

import { NODE_COLORS, type CanvasNodeColor } from "@/types/canvas"

interface NodeColorToolbarProps {
  activeColor: string
  onSelect: (color: CanvasNodeColor) => void
}

export function NodeColorToolbar({ activeColor, onSelect }: Readonly<NodeColorToolbarProps>) {
  return (
    <div
      className="nodrag nopan absolute bottom-full left-1/2 z-10 mb-2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-default bg-surface px-2 py-1.5 shadow-lg"
      onMouseDown={(event) => event.stopPropagation()}
    >
      {NODE_COLORS.map((pair) => {
        const isActive = pair.fill === activeColor

        return (
          <button
            aria-label={`Set node color to ${pair.fill}`}
            aria-pressed={isActive}
            className="h-5 w-5 shrink-0 rounded-full transition-transform hover:scale-110"
            key={pair.fill}
            onClick={() => onSelect(pair)}
            style={{
              backgroundColor: pair.fill,
              boxShadow: isActive
                ? `0 0 0 2px var(--bg-surface), 0 0 0 3.5px ${pair.text}`
                : `0 0 0 1px var(--border-subtle)`,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.boxShadow = isActive
                ? `0 0 0 2px var(--bg-surface), 0 0 0 3.5px ${pair.text}, 0 0 6px 1px ${pair.text}`
                : `0 0 0 1px var(--border-subtle), 0 0 6px 1px ${pair.text}`
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.boxShadow = isActive
                ? `0 0 0 2px var(--bg-surface), 0 0 0 3.5px ${pair.text}`
                : `0 0 0 1px var(--border-subtle)`
            }}
            type="button"
          />
        )
      })}
    </div>
  )
}
