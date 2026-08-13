"use client"

import { useEffect } from "react"
import { FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type ProjectSummary } from "@/hooks/use-project-actions"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  activeProjectId?: string
  isOpen: boolean
  onClose: () => void
  onCreateProject: () => void
  onDeleteProject: (project: ProjectSummary) => void
  onOpenProject: (projectId: string) => void
  onRenameProject: (project: ProjectSummary) => void
  ownedProjects: ProjectSummary[]
  sharedProjects: ProjectSummary[]
  toggleButtonRef?: React.RefObject<HTMLElement | null>
}

function EmptyProjects() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-copy-muted">
      <FolderOpen className="h-8 w-8 text-copy-faint" />
      <p className="text-sm">No projects yet.</p>
    </div>
  )
}

interface ProjectListProps {
  activeProjectId?: string
  onDeleteProject?: (project: ProjectSummary) => void
  onOpenProject: (projectId: string) => void
  onRenameProject?: (project: ProjectSummary) => void
  projects: ProjectSummary[]
}

function ProjectList({
  activeProjectId,
  onDeleteProject,
  onOpenProject,
  onRenameProject,
  projects,
}: Readonly<ProjectListProps>) {
  if (!projects.length) {
    return <EmptyProjects />
  }

  return (
    <div className="mt-3 grid gap-1">
      {projects.map((project) => {
        const isActive = project.id === activeProjectId

        return (
        <div
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 hover:bg-surface-subtle",
            isActive && "bg-accent-dim"
          )}
          key={project.id}
        >
          <button
            aria-current={isActive ? "true" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={() => onOpenProject(project.id)}
            type="button"
          >
            <FolderOpen className="h-4 w-4 shrink-0 text-copy-muted" />
            <span className="min-w-0 flex-1 truncate text-sm text-copy-primary">{project.name}</span>
          </button>
          {onRenameProject && onDeleteProject ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                aria-label={`Rename ${project.name}`}
                onClick={() => onRenameProject(project)}
                size="icon-xs"
                title="Rename project"
                variant="ghost"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                aria-label={`Delete ${project.name}`}
                onClick={() => onDeleteProject(project)}
                size="icon-xs"
                title="Delete project"
                variant="ghost"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
        )
      })}
    </div>
  )
}

export function ProjectSidebar({
  activeProjectId,
  isOpen,
  onClose,
  onCreateProject,
  onDeleteProject,
  onOpenProject,
  onRenameProject,
  ownedProjects,
  sharedProjects,
  toggleButtonRef,
}: Readonly<ProjectSidebarProps>) {
  useEffect(() => {
    if (!isOpen && toggleButtonRef?.current) {
      toggleButtonRef.current.focus()
    }
  }, [isOpen, toggleButtonRef])

  return (
    <>
      {isOpen ? (
        <button
          aria-label="Close projects sidebar"
          className="fixed inset-0 z-10 bg-base/70 md:hidden"
          onClick={onClose}
          type="button"
        />
      ) : null}
    <aside
      aria-hidden={!isOpen}
      aria-label="Projects"
      className={cn(
        "fixed top-[4.5rem] bottom-4 left-4 z-20 flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-2xl border border-surface-border bg-surface/95 p-3 shadow-2xl backdrop-blur transition-transform duration-200",
        isOpen ? "translate-x-0" : "-translate-x-[calc(100%+1.5rem)]"
      )}
      inert={!isOpen}
    >
      <div className="flex items-center justify-between px-1 pb-3">
        <h2 className="text-base font-semibold text-copy-primary">Projects</h2>
        <Button aria-label="Close projects sidebar" onClick={onClose} size="icon-sm" variant="ghost">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs className="min-h-0 flex-1" defaultValue="my-projects">
        <TabsList className="w-full">
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>
        <TabsContent className="flex h-full flex-col" value="my-projects">
          <ProjectList
            activeProjectId={activeProjectId}
            onDeleteProject={onDeleteProject}
            onOpenProject={onOpenProject}
            onRenameProject={onRenameProject}
            projects={ownedProjects}
          />
        </TabsContent>
        <TabsContent className="flex h-full flex-col" value="shared">
          <ProjectList activeProjectId={activeProjectId} onOpenProject={onOpenProject} projects={sharedProjects} />
        </TabsContent>
      </Tabs>

      <Button className="mt-3 w-full" onClick={onCreateProject} size="lg">
        <Plus className="h-5 w-5" />
        New Project
      </Button>
    </aside>
    </>
  )
}