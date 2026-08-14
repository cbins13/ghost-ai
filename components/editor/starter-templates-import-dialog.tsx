"use client"

import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface StarterTemplatesImportDialogProps {
  template: CanvasTemplate | null
  hasConflict: boolean
  onConfirm: () => void
  onRetry: () => void
  onCancel: () => void
}

export function StarterTemplatesImportDialog({
  template,
  hasConflict,
  onConfirm,
  onRetry,
  onCancel,
}: Readonly<StarterTemplatesImportDialogProps>) {
  return (
    <Dialog onOpenChange={(open) => !open && onCancel()} open={template !== null}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hasConflict ? "Canvas changed" : "Replace current canvas?"}</DialogTitle>
          <DialogDescription>
            {hasConflict
              ? "Someone else edited this canvas while the import was pending. Review the latest changes, then retry the import if you still want to replace the canvas."
              : template?.name
                ? `Importing "${template.name}" will replace every node and edge currently on the canvas. This can be undone with a single undo.`
                : "Importing this template will replace every node and edge currently on the canvas. This can be undone with a single undo."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          {hasConflict ? (
            <Button onClick={onRetry}>Refresh &amp; Retry</Button>
          ) : (
            <Button onClick={onConfirm}>Replace canvas</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
