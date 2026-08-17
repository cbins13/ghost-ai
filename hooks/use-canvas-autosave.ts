"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { CanvasState } from "@/lib/canvas-storage"
import type { CanvasEdge, CanvasNode } from "@/types/canvas"

export type CanvasSaveStatus = "idle" | "saving" | "saved" | "error"

const AUTOSAVE_DEBOUNCE_MS = 1500

interface CanvasSaveResponse {
  canvas: CanvasState
  revision: number
}

interface UseCanvasAutosaveOptions {
  projectId: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  initialRevision: number | null
  onReconcile: (canvas: CanvasState) => void
}

const SAVE_STATUS_RESET_MS = 2000

export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  initialRevision,
  onReconcile,
}: UseCanvasAutosaveOptions): { status: CanvasSaveStatus; save: () => Promise<void> } {
  const [status, setStatus] = useState<CanvasSaveStatus>("idle")
  const revisionRef = useRef<number | null>(initialRevision)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)
  const hasPendingSaveRef = useRef(false)

  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  useEffect(() => {
    revisionRef.current = initialRevision
  }, [initialRevision])

  const save = useCallback(async () => {
    if (revisionRef.current === null) {
      return
    }

    if (isSavingRef.current) {
      hasPendingSaveRef.current = true
      return
    }

    isSavingRef.current = true

    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = null
    }

    do {
      hasPendingSaveRef.current = false
      setStatus("saving")

      try {
        const response = await fetch(`/api/projects/${projectId}/canvas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canvas: { nodes: nodesRef.current, edges: edgesRef.current },
            revision: revisionRef.current,
          }),
        })

        if (response.status === 409) {
          const body = (await response.json()) as CanvasSaveResponse
          revisionRef.current = body.revision
          onReconcile(body.canvas)
          setStatus("saved")
        } else if (!response.ok) {
          setStatus("error")
        } else {
          const body = (await response.json()) as CanvasSaveResponse
          revisionRef.current = body.revision
          setStatus("saved")
        }
      } catch {
        setStatus("error")
      }
    } while (hasPendingSaveRef.current)

    isSavingRef.current = false

    resetTimeoutRef.current = setTimeout(() => {
      setStatus("idle")
    }, SAVE_STATUS_RESET_MS)
  }, [onReconcile, projectId])

  useEffect(() => {
    if (revisionRef.current === null) {
      return
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      void save()
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [nodes, edges, initialRevision, save])

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current)
      }
    }
  }, [])

  return { status, save }
}
