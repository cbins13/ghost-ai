import { useEffect } from "react"

const ZOOM_DURATION_MS = 200

interface KeyboardShortcutZoomHandle {
  zoomIn: (options?: { duration?: number }) => void
  zoomOut: (options?: { duration?: number }) => void
}

interface UseKeyboardShortcutsOptions {
  reactFlowInstance: KeyboardShortcutZoomHandle | null
  onUndo: () => void
  onRedo: () => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
}

export function useKeyboardShortcuts({ reactFlowInstance, onUndo, onRedo }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return
      }

      const { key, ctrlKey, metaKey, shiftKey, altKey } = event
      const exactlyOneCtrlOrMeta = ctrlKey !== metaKey

      const isZoomIn = (key === "=" && !ctrlKey && !metaKey && !shiftKey && !altKey) ||
        (key === "+" && shiftKey && !ctrlKey && !metaKey && !altKey)

      const isZoomOut = key === "-" && !ctrlKey && !metaKey && !shiftKey && !altKey

      const isUndo = key === "z" && exactlyOneCtrlOrMeta && !shiftKey && !altKey

      const isRedo =
        (key === "z" && exactlyOneCtrlOrMeta && shiftKey && !altKey) ||
        (key === "y" && exactlyOneCtrlOrMeta && !shiftKey && !altKey)

      if (isZoomIn) {
        event.preventDefault()
        reactFlowInstance?.zoomIn({ duration: ZOOM_DURATION_MS })
        return
      }

      if (isZoomOut) {
        event.preventDefault()
        reactFlowInstance?.zoomOut({ duration: ZOOM_DURATION_MS })
        return
      }

      if (isUndo) {
        event.preventDefault()
        onUndo()
        return
      }

      if (isRedo) {
        event.preventDefault()
        onRedo()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [reactFlowInstance, onUndo, onRedo])
}
