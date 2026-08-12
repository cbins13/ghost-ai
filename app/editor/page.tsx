"use client"

import { useRef, useState } from "react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"

export default function EditorPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const sidebarToggleRef = useRef<HTMLButtonElement>(null)

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
        toggleButtonRef={sidebarToggleRef}
      />
      <div aria-label="Editor canvas" className="flex-1" />
    </main>
  )
}