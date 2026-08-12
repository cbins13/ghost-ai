"use client"

import { useState, type Dispatch, type SetStateAction, type SyntheticEvent } from "react"

export interface MockProject {
  id: string
  name: string
}

interface UseProjectDialogsOptions {
  setOwnedProjects: Dispatch<SetStateAction<MockProject[]>>
}

type ProjectDialogType = "create" | "rename" | "delete"

interface ActiveProjectDialog {
  type: ProjectDialogType
  project?: MockProject
}

function waitForMockRequest() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 250))
}

export function useProjectDialogs({ setOwnedProjects }: UseProjectDialogsOptions) {
  const [activeDialog, setActiveDialog] = useState<ActiveProjectDialog | null>(null)
  const [projectName, setProjectName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  function closeDialog() {
    if (isLoading) {
      return
    }

    setActiveDialog(null)
    setProjectName("")
  }

  function openCreateDialog() {
    setProjectName("")
    setActiveDialog({ type: "create" })
  }

  function openRenameDialog(project: MockProject) {
    setProjectName(project.name)
    setActiveDialog({ type: "rename", project })
  }

  function openDeleteDialog(project: MockProject) {
    setProjectName("")
    setActiveDialog({ type: "delete", project })
  }

  async function submitDialog(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    if (activeDialog?.type !== "delete" && !projectName.trim()) {
      return
    }

    setIsLoading(true)
    await waitForMockRequest()

    if (activeDialog?.type === "create") {
      setOwnedProjects((projects) => [...projects, { id: crypto.randomUUID(), name: projectName.trim() }])
    }

    if (activeDialog?.type === "rename" && activeDialog.project) {
      setOwnedProjects((projects) =>
        projects.map((project) =>
          project.id === activeDialog.project?.id ? { ...project, name: projectName.trim() } : project
        )
      )
    }

    if (activeDialog?.type === "delete" && activeDialog.project) {
      setOwnedProjects((projects) => projects.filter((project) => project.id !== activeDialog.project?.id))
    }

    setIsLoading(false)
    setActiveDialog(null)
    setProjectName("")
  }

  return {
    activeDialog,
    closeDialog,
    isLoading,
    openCreateDialog,
    openDeleteDialog,
    openRenameDialog,
    projectName,
    setProjectName,
    submitDialog,
  }
}