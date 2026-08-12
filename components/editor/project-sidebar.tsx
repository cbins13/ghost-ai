"use client"

import { useEffect } from "react"
import { FolderOpen, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
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

export function ProjectSidebar({ isOpen, onClose, toggleButtonRef }: ProjectSidebarProps) {
  useEffect(() => {
    if (!isOpen && toggleButtonRef?.current) {
      toggleButtonRef.current.focus()
    }
  }, [isOpen, toggleButtonRef])

  return (
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
          <EmptyProjects />
        </TabsContent>
        <TabsContent className="flex h-full flex-col" value="shared">
          <EmptyProjects />
        </TabsContent>
      </Tabs>

      <Button className="mt-3 w-full" size="lg">
        <Plus className="h-5 w-5" />
        New Project
      </Button>
    </aside>
  )
}