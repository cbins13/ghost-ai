"use client"

import { UserButton } from "@clerk/nextjs"
import { LayoutTemplate, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"

interface WorkspaceNavbarProps {
  isAiSidebarOpen: boolean
  isSidebarOpen: boolean
  onAiSidebarToggle: () => void
  onShareClick: () => void
  onSidebarToggle: () => void
  onTemplatesClick: () => void
  projectName: string
  sidebarToggleRef?: React.RefObject<HTMLButtonElement | null>
}

export function WorkspaceNavbar({
  isAiSidebarOpen,
  isSidebarOpen,
  onAiSidebarToggle,
  onShareClick,
  onSidebarToggle,
  onTemplatesClick,
  projectName,
  sidebarToggleRef,
}: Readonly<WorkspaceNavbarProps>) {
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen
  const AiSidebarIcon = isAiSidebarOpen ? PanelRightClose : PanelRightOpen

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-surface-border bg-surface px-3">
      <div className="flex flex-1 items-center">
        <Button
          ref={sidebarToggleRef}
          aria-label={isSidebarOpen ? "Close projects sidebar" : "Open projects sidebar"}
          onClick={onSidebarToggle}
          size="icon"
          variant="ghost"
        >
          <SidebarIcon className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex flex-1 justify-center overflow-hidden">
        <span className="truncate text-sm font-medium text-copy-primary">{projectName}</span>
      </div>
      <div className="flex flex-1 items-center justify-end gap-1">
        <Button onClick={onTemplatesClick} size="sm" variant="outline">
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </Button>
        <Button onClick={onShareClick} size="sm" variant="outline">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
        <Button
          aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
          className="hidden md:flex"
          onClick={onAiSidebarToggle}
          size="icon"
          variant="ghost"
        >
          <AiSidebarIcon className="h-5 w-5" />
        </Button>
        <UserButton />
      </div>
    </header>
  )
}
