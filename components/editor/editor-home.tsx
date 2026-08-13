"use client"

import { useRef, useState } from "react"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { Button } from "@/components/ui/button"
import { useProjectActions, type ProjectSummary } from "@/hooks/use-project-actions"

interface EditorHomeProps {
  ownedProjects: ProjectSummary[]
  sharedProjects: ProjectSummary[]
}

export function EditorHome({ ownedProjects, sharedProjects }: Readonly<EditorHomeProps>) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const sidebarToggleRef = useRef<HTMLButtonElement>(null)
  const projectActions = useProjectActions()

  function openProject(projectId: string) {
    router.refresh()
    setIsSidebarOpen(false)
  }

  return (
    <main className="flex min-h-screen flex-col overflow-hidden bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((isOpen) => !isOpen)}
        sidebarToggleRef={sidebarToggleRef}
      />
      <ProjectSidebar
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
      <section aria-label="Editor home" className="flex flex-1 items-center justify-center px-6 pb-14">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-copy-primary">Create a project or open an existing one</h1>
          <p className="mt-3 text-sm leading-6 text-copy-muted">
            Start a new architecture workspace, or choose a project from the sidebar.
          </p>
          <Button className="mt-6" onClick={projectActions.openCreateDialog} size="lg">
            <Plus className="h-5 w-5" />
            New Project
          </Button>
        </div>
      </section>
      <ProjectDialogs
        activeDialog={projectActions.activeDialog}
        error={projectActions.error}
        isLoading={projectActions.isLoading}
        onClose={projectActions.closeDialog}
        onProjectNameChange={projectActions.setProjectName}
        onSubmit={projectActions.submitDialog}
        projectName={projectActions.projectName}
      />
    </main>
  )
}
