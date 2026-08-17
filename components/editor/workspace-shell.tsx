"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { AiSidebar } from "@/components/editor/ai-sidebar"
import { Canvas } from "@/components/editor/canvas"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { WorkspaceNavbar } from "@/components/editor/workspace-navbar"
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave"
import { useProjectActions, type ProjectSummary } from "@/hooks/use-project-actions"
import { type ProjectDto } from "@/lib/projects"

interface WorkspaceShellProps {
  activeProjectId: string
  isOwner: boolean
  ownedProjects: ProjectSummary[]
  project: ProjectDto
  sharedProjects: ProjectSummary[]
}

export function WorkspaceShell({
  activeProjectId,
  isOwner,
  ownedProjects,
  project,
  sharedProjects,
}: Readonly<WorkspaceShellProps>) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("idle")
  const sidebarToggleRef = useRef<HTMLButtonElement>(null)
  const saveRequestRef = useRef<(() => void) | null>(null)
  const projectActions = useProjectActions({ activeProjectId })

  function openProject(projectId: string) {
    if (projectId === activeProjectId) {
      setIsSidebarOpen(false)
      return
    }

    router.push(`/editor/${projectId}`)
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-base text-copy-primary">
      <WorkspaceNavbar
        isAiSidebarOpen={isAiSidebarOpen}
        isSidebarOpen={isSidebarOpen}
        onAiSidebarToggle={() => setIsAiSidebarOpen((isOpen) => !isOpen)}
        onSaveClick={() => saveRequestRef.current?.()}
        onShareClick={() => setIsShareDialogOpen(true)}
        onSidebarToggle={() => setIsSidebarOpen((isOpen) => !isOpen)}
        onTemplatesClick={() => setIsTemplatesModalOpen(true)}
        projectName={project.name}
        saveStatus={saveStatus}
        sidebarToggleRef={sidebarToggleRef}
      />
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar
          activeProjectId={activeProjectId}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onCreateProject={projectActions.openCreateDialog}
          onDeleteProject={projectActions.openDeleteDialog}
          onOpenProject={openProject}
          onRenameProject={projectActions.openRenameDialog}
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
          toggleButtonRef={sidebarToggleRef}
        />
        <section aria-label="Canvas" className="flex flex-1 bg-base">
          <Canvas
            isTemplatesModalOpen={isTemplatesModalOpen}
            onSaveRequestReady={(save) => {
              saveRequestRef.current = save
            }}
            onSaveStatusChange={setSaveStatus}
            onTemplatesModalOpenChange={setIsTemplatesModalOpen}
            roomId={activeProjectId}
          />
        </section>
        <AiSidebar isOpen={isAiSidebarOpen} onClose={() => setIsAiSidebarOpen(false)} />
      </div>
      <ProjectDialogs
        activeDialog={projectActions.activeDialog}
        error={projectActions.error}
        isLoading={projectActions.isLoading}
        onClose={projectActions.closeDialog}
        onProjectNameChange={projectActions.setProjectName}
        onSubmit={projectActions.submitDialog}
        projectName={projectActions.projectName}
      />
      <ShareDialog
        isOpen={isShareDialogOpen}
        isOwner={isOwner}
        onOpenChange={setIsShareDialogOpen}
        projectId={activeProjectId}
        projectName={project.name}
      />
    </main>
  )
}
