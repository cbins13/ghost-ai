"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, type SyntheticEvent } from "react"

export interface ProjectSummary {
  id: string
  name: string
}

type ProjectDialogType = "create" | "rename" | "delete"

interface ActiveProjectDialog {
  type: ProjectDialogType
  project?: ProjectSummary
}

interface UseProjectActionsOptions {
  activeProjectId?: string
}

const PROJECT_REQUEST_TIMEOUT_MS = 10_000

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json()
    return typeof body?.error?.message === "string" ? body.error.message : fallback
  } catch {
    return fallback
  }
}

export function useProjectActions({ activeProjectId }: UseProjectActionsOptions = {}) {
  const router = useRouter()
  const [activeDialog, setActiveDialog] = useState<ActiveProjectDialog | null>(null)
  const [projectName, setProjectName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeRequestRef = useRef<{ controller: AbortController; timedOut: boolean } | null>(null)

  function closeDialog() {
    activeRequestRef.current?.controller.abort()

    setActiveDialog(null)
    setProjectName("")
    setError(null)
  }

  function openCreateDialog() {
    setProjectName("")
    setError(null)
    setActiveDialog({ type: "create" })
  }

  function openRenameDialog(project: ProjectSummary) {
    setProjectName(project.name)
    setError(null)
    setActiveDialog({ type: "rename", project })
  }

  function openDeleteDialog(project: ProjectSummary) {
    setProjectName("")
    setError(null)
    setActiveDialog({ type: "delete", project })
  }

  async function createProject(signal: AbortSignal) {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: projectName.trim() }),
      signal,
    })

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, "Could not create the project."))
    }

    const { project } = (await response.json()) as { project: ProjectSummary }
    router.push(`/editor/${project.id}`)
  }

  async function renameProject(project: ProjectSummary, signal: AbortSignal) {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: projectName.trim() }),
      signal,
    })

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, "Could not rename the project."))
    }

    router.refresh()
  }

  async function deleteProject(project: ProjectSummary, signal: AbortSignal) {
    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE", signal })

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, "Could not delete the project."))
    }

    if (activeProjectId && project.id === activeProjectId) {
      router.push("/editor")
    } else {
      router.refresh()
    }
  }

  async function submitDialog(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activeDialog) {
      return
    }

    if (activeDialog.type !== "delete" && !projectName.trim()) {
      return
    }

    setIsLoading(true)
    setError(null)
    const request = { controller: new AbortController(), timedOut: false }
    activeRequestRef.current = request
    const timeoutId = setTimeout(() => {
      request.timedOut = true
      request.controller.abort()
    }, PROJECT_REQUEST_TIMEOUT_MS)

    try {
      if (activeDialog.type === "create") {
        await createProject(request.controller.signal)
      }

      if (activeDialog.type === "rename" && activeDialog.project) {
        await renameProject(activeDialog.project, request.controller.signal)
      }

      if (activeDialog.type === "delete" && activeDialog.project) {
        await deleteProject(activeDialog.project, request.controller.signal)
      }

      setActiveDialog(null)
      setProjectName("")
    } catch (submitError) {
      if (request.controller.signal.aborted) {
        if (request.timedOut) {
          setError("The request timed out. Please try again.")
        }
        return
      }

      setError(submitError instanceof Error ? submitError.message : "Something went wrong.")
    } finally {
      clearTimeout(timeoutId)
      if (activeRequestRef.current === request) {
        activeRequestRef.current = null
      }
      setIsLoading(false)
    }
  }

  return {
    activeDialog,
    closeDialog,
    error,
    isLoading,
    openCreateDialog,
    openDeleteDialog,
    openRenameDialog,
    projectName,
    setProjectName,
    submitDialog,
  }
}
