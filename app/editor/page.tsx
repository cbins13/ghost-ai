"use client"

import { useRef, useState } from "react"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { useProjectDialogs } from "@/components/editor/use-project-dialogs"
import { Button } from "@/components/ui/button"

const INITIAL_OWNED_PROJECTS = [
  { id: "payments-platform", name: "Payments platform" },
  { id: "event-pipeline", name: "Event pipeline" },
]

const INITIAL_SHARED_PROJECTS = [{ id: "customer-identity", name: "Customer identity" }]

export default function EditorPage() {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [ownedProjects, setOwnedProjects] = useState(INITIAL_OWNED_PROJECTS)
  const [sharedProjects] = useState(INITIAL_SHARED_PROJECTS)
  const sidebarToggleRef = useRef<HTMLButtonElement>(null)
  const projectDialogs = useProjectDialogs({ setOwnedProjects })

  function openProject(projectId: string) {
    router.push(`/editor/${projectId}`)
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
        onCreateProject={projectDialogs.openCreateDialog}
        onDeleteProject={projectDialogs.openDeleteDialog}
        onOpenProject={openProject}
        onRenameProject={projectDialogs.openRenameDialog}
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
          <Button className="mt-6" onClick={projectDialogs.openCreateDialog} size="lg">
            <Plus className="h-5 w-5" />
            New Project
          </Button>
        </div>
      </section>
      <ProjectDialogs
        activeDialog={projectDialogs.activeDialog}
        isLoading={projectDialogs.isLoading}
        onClose={projectDialogs.closeDialog}
        onProjectNameChange={projectDialogs.setProjectName}
        onSubmit={projectDialogs.submitDialog}
        projectName={projectDialogs.projectName}
      />
    </main>
  )
}