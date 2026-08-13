"use client"

import { type SyntheticEvent } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type ProjectSummary } from "@/hooks/use-project-actions"

interface ProjectDialogsProps {
  activeDialog: { type: "create" | "rename" | "delete"; project?: ProjectSummary } | null
  error?: string | null
  isLoading: boolean
  onClose: () => void
  onProjectNameChange: (projectName: string) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  projectName: string
}

function toSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .split("-")
    .filter(Boolean)
    .join("-")

  return slug || "new-project"
}

function getDialogTitle(type: "create" | "rename" | "delete") {
  switch (type) {
    case "create":
      return "Create project"
    case "rename":
      return "Rename project"
    case "delete":
      return "Delete project"
  }
}

function getSubmitLabel(type: "create" | "rename" | "delete", isLoading: boolean) {
  if (isLoading) {
    return "Working..."
  }

  switch (type) {
    case "create":
      return "Create project"
    case "rename":
      return "Save changes"
    case "delete":
      return "Delete project"
  }
}

export function ProjectDialogs({
  activeDialog,
  error,
  isLoading,
  onClose,
  onProjectNameChange,
  onSubmit,
  projectName,
}: Readonly<ProjectDialogsProps>) {
  if (!activeDialog) {
    return null
  }

  const isCreate = activeDialog.type === "create"
  const isRename = activeDialog.type === "rename"
  const project = activeDialog.project
  const dialogTitle = getDialogTitle(activeDialog.type)
  const submitLabel = getSubmitLabel(activeDialog.type, isLoading)

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="rounded-3xl bg-surface p-6" showCloseButton={!isLoading}>
        <form className="grid gap-5" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="text-copy-muted">
              {isCreate && "Name your new architecture workspace."}
              {isRename && `Rename ${project?.name ?? "this project"}.`}
              {!isCreate && !isRename && `Delete ${project?.name ?? "this project"}? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>

          {isCreate || isRename ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-copy-secondary" htmlFor="project-name">
                Project name
              </label>
              <Input
                autoFocus
                disabled={isLoading}
                id="project-name"
                onChange={(event) => onProjectNameChange(event.target.value)}
                placeholder="Payments platform"
                value={projectName}
              />
              {isCreate && (
                <p className="font-mono text-xs text-copy-muted">ghostai.dev/projects/{toSlug(projectName)}</p>
              )}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl bg-surface-elevated">
            <Button disabled={isLoading} onClick={onClose} type="button" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={isLoading || ((isCreate || isRename) && !projectName.trim())}
              type="submit"
              variant={activeDialog.type === "delete" ? "destructive" : "default"}
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}