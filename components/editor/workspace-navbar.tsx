"use client"

import {
  AlertCircle,
  Check,
  LayoutTemplate,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Save,
  Share2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave"

interface WorkspaceNavbarProps {
  isAiSidebarOpen: boolean
  isSidebarOpen: boolean
  onAiSidebarToggle: () => void
  onSaveClick: () => void
  onShareClick: () => void
  onSidebarToggle: () => void
  onTemplatesClick: () => void
  projectName: string
  saveStatus: CanvasSaveStatus
  sidebarToggleRef?: React.RefObject<HTMLButtonElement | null>
}

const SAVE_STATUS_LABEL: Record<CanvasSaveStatus, string> = {
  idle: "Save",
  saving: "Saving…",
  saved: "Saved",
  error: "Error",
}

function SaveStatusIcon({ status }: Readonly<{ status: CanvasSaveStatus }>) {
  if (status === "saving") {
    return <Loader2 className="h-4 w-4 animate-spin" />
  }

  if (status === "saved") {
    return <Check className="h-4 w-4 text-brand" />
  }

  if (status === "error") {
    return <AlertCircle className="h-4 w-4 text-destructive" />
  }

  return <Save className="h-4 w-4" />
}

export function WorkspaceNavbar({
  isAiSidebarOpen,
  isSidebarOpen,
  onAiSidebarToggle,
  onSaveClick,
  onShareClick,
  onSidebarToggle,
  onTemplatesClick,
  projectName,
  saveStatus,
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
        <Button disabled={saveStatus === "saving"} onClick={onSaveClick} size="sm" variant="outline">
          <SaveStatusIcon status={saveStatus} />
          {SAVE_STATUS_LABEL[saveStatus]}
        </Button>
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
      </div>
    </header>
  )
}
