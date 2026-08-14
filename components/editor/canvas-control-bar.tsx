"use client"

import { Maximize, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react"

const ZOOM_DURATION_MS = 200

interface CanvasControlBarZoomHandle {
  zoomIn: (options?: { duration?: number }) => void
  zoomOut: (options?: { duration?: number }) => void
  fitView: (options?: { duration?: number }) => void
}

interface CanvasControlBarProps {
  reactFlowInstance: CanvasControlBarZoomHandle | null
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

interface ControlButtonProps {
  label: string
  icon: typeof ZoomIn
  onClick: () => void
  disabled?: boolean
}

function ControlButton({ label, icon: Icon, onClick, disabled }: Readonly<ControlButtonProps>) {
  return (
    <button
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-copy-secondary transition-colors hover:bg-subtle hover:text-copy-primary disabled:pointer-events-none disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

export function CanvasControlBar({
  reactFlowInstance,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Readonly<CanvasControlBarProps>) {
  return (
    <div className="pointer-events-none absolute bottom-24 left-6 z-10 flex">
      <div className="pointer-events-auto flex items-center gap-1 rounded-3xl border border-surface-border bg-surface/90 p-2 shadow-lg backdrop-blur">
        <ControlButton
          icon={ZoomOut}
          label="Zoom out"
          onClick={() => reactFlowInstance?.zoomOut({ duration: ZOOM_DURATION_MS })}
        />
        <ControlButton
          icon={Maximize}
          label="Fit view"
          onClick={() => reactFlowInstance?.fitView({ duration: ZOOM_DURATION_MS })}
        />
        <ControlButton
          icon={ZoomIn}
          label="Zoom in"
          onClick={() => reactFlowInstance?.zoomIn({ duration: ZOOM_DURATION_MS })}
        />
        <div className="mx-1 h-6 w-px bg-surface-border" />
        <ControlButton disabled={!canUndo} icon={Undo2} label="Undo" onClick={onUndo} />
        <ControlButton disabled={!canRedo} icon={Redo2} label="Redo" onClick={onRedo} />
      </div>
    </div>
  )
}
