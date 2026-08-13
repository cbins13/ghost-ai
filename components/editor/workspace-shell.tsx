"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { WorkspaceNavbar } from "@/components/editor/workspace-navbar"
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
  const sidebarToggleRef = useRef<HTMLButtonElement>(null)
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
        onShareClick={() => setIsShareDialogOpen(true)}
        onSidebarToggle={() => setIsSidebarOpen((isOpen) => !isOpen)}
        projectName={project.name}
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
        <section aria-label="Canvas" className="flex flex-1 items-center justify-center bg-base">
          <p className="text-sm text-copy-muted">Canvas coming soon</p>
        </section>
        {isAiSidebarOpen ? (
          <aside
            aria-label="AI assistant"
            className="hidden w-80 shrink-0 flex-col border-l border-surface-border bg-surface md:flex"
          >
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-copy-muted">
              AI chat coming soon
            </div>
          </aside>
        ) : null}
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
