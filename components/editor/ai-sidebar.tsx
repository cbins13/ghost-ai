"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { Bot, Download, FileText, Loader2, Send, X } from "lucide-react"
import { ClientSideSuspense, useEventListener } from "@liveblocks/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import { useRealtimeRun } from "@trigger.dev/react-hooks"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { aiChatMessageSchema, type AiChatMessage } from "@/types/tasks"
import type { designAgentTask } from "@/src/trigger/design-agent"
import type { generateSpecTask } from "@/src/trigger/generate-spec"
import { useProjectSpecs, type ProjectSpecSummary } from "@/hooks/use-project-specs"
import { SpecPreviewDialog } from "@/components/editor/spec-preview-dialog"
import type { CanvasEdge, CanvasNode } from "@/types/canvas"

const RUN_WATCHDOG_TIMEOUT_MS = 60_000
const SPEC_POLL_INTERVAL_MS = 3_000
const SPEC_GENERATION_TIMEOUT_MS = 120_000

const TERMINAL_RUN_STATUSES = new Set([
  "COMPLETED",
  "CANCELED",
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "TIMED_OUT",
  "EXPIRED",
])

interface DesignAgentStatusEvent {
  type: "design-agent-status"
  runId: string
  status: "started" | "processing" | "complete" | "error"
  message: string
}

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

function formatSpecDate(createdAt: string) {
  return new Date(createdAt).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function downloadSpec(projectId: string, spec: ProjectSpecSummary) {
  const anchor = document.createElement("a")
  anchor.href = `/api/projects/${projectId}/specs/${spec.id}/download`
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export function AiSidebar({ isOpen, onClose, roomId }: Readonly<AiSidebarProps>) {
  return (
    <ClientSideSuspense fallback={<AiSidebarShell isOpen={isOpen} onClose={onClose} />}>
      <AiSidebarContent isOpen={isOpen} onClose={onClose} roomId={roomId} />
    </ClientSideSuspense>
  )
}

interface AiSidebarContentProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
}

function AiSidebarContent({ isOpen, onClose, roomId }: Readonly<AiSidebarContentProps>) {
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [previewSpec, setPreviewSpec] = useState<ProjectSpecSummary | null>(null)
  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false)
  const [specRunId, setSpecRunId] = useState<string | null>(null)
  const [specPublicToken, setSpecPublicToken] = useState<string | null>(null)
  const [specGenerationError, setSpecGenerationError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const processedRunIdRef = useRef<string | null>(null)
  const processedSpecRunIdRef = useRef<string | null>(null)
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const specPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const specWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const specBaselineIdsRef = useRef<Set<string>>(new Set())

  const { error: specsError, isLoading: isLoadingSpecs, reload: reloadSpecs, specs } = useProjectSpecs(roomId, true)
  const { nodes: canvasNodes, edges: canvasEdges } = useLiveblocksFlow<CanvasNode, CanvasEdge>({
    nodes: { initial: [] },
    edges: { initial: [] },
    suspense: true,
  })

  const { run } = useRealtimeRun<typeof designAgentTask>(runId ?? undefined, {
    accessToken: publicToken ?? undefined,
    enabled: Boolean(runId && publicToken),
  })

  const { run: specRun } = useRealtimeRun<typeof generateSpecTask>(specRunId ?? undefined, {
    accessToken: specPublicToken ?? undefined,
    enabled: Boolean(specRunId && specPublicToken),
    onComplete: (completedRun) => {
      if (processedSpecRunIdRef.current === completedRun.id) {
        return
      }
      processedSpecRunIdRef.current = completedRun.id
      finishSpecGeneration(completedRun.status === "COMPLETED")
    },
  })

  const isRunActive = Boolean(runId) && (!run || !TERMINAL_RUN_STATUSES.has(run.status))
  const isSpecRunActive = Boolean(specRunId) && (!specRun || !TERMINAL_RUN_STATUSES.has(specRun.status))

  function clearWatchdog() {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }

  function clearSpecPolling() {
    if (specPollRef.current) {
      clearInterval(specPollRef.current)
      specPollRef.current = null
    }
  }

  function clearSpecWatchdog() {
    if (specWatchdogRef.current) {
      clearTimeout(specWatchdogRef.current)
      specWatchdogRef.current = null
    }
  }

  function finishSpecGeneration(succeeded: boolean) {
    clearSpecPolling()
    clearSpecWatchdog()
    setSpecRunId(null)
    setSpecPublicToken(null)

    if (succeeded) {
      reloadSpecs()
    } else {
      setSpecGenerationError("Spec generation failed. Please try again.")
    }
  }

  // The realtime run subscription can miss a run's completion event when the task
  // finishes before the client finishes subscribing (a short `generateText` call can
  // complete in well under a second). This poll is a fallback that catches that race by
  // periodically checking whether a new spec has appeared, so generation never gets stuck
  // showing a spinner even if the realtime `onComplete` callback above never fires.
  async function pollForNewSpec(pollRunId: string) {
    try {
      const response = await fetch(`/api/projects/${roomId}/specs`)

      if (!response.ok) {
        return
      }

      const body = (await response.json()) as { specs: ProjectSpecSummary[] }
      const hasNewSpec = body.specs.some((item) => !specBaselineIdsRef.current.has(item.id))

      if (hasNewSpec && processedSpecRunIdRef.current !== pollRunId) {
        processedSpecRunIdRef.current = pollRunId
        finishSpecGeneration(true)
      }
    } catch {
      // Transient poll failure; the next interval tick (or the watchdog) will retry or surface an error.
    }
  }

  function armWatchdog(forRunId: string) {
    clearWatchdog()
    watchdogRef.current = setTimeout(() => {
      if (processedRunIdRef.current === forRunId) {
        return
      }
      processedRunIdRef.current = forRunId
      setRunId(null)
      setPublicToken(null)
      setStatusMessage(null)
      setMessages((current) => [
        ...current,
        {
          type: "ai-chat-message",
          sender: "Ghost AI",
          role: "assistant",
          content: "Lost connection while Ghost AI was working. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ])
    }, RUN_WATCHDOG_TIMEOUT_MS)
  }

  useEffect(() => clearWatchdog, [])
  useEffect(() => () => {
    clearSpecPolling()
    clearSpecWatchdog()
  }, [])

  useEventListener(({ event }) => {
    if (event.type === "ai-chat-message") {
      const parsed = aiChatMessageSchema.safeParse(event)
      if (!parsed.success) {
        return
      }

      setMessages((current) => [...current, parsed.data])
      return
    }

    if (event.type === "design-agent-status") {
      const statusEvent = event as DesignAgentStatusEvent
      if (statusEvent.runId !== runId) {
        return
      }

      setStatusMessage(statusEvent.message)

      if (
        (statusEvent.status === "complete" || statusEvent.status === "error") &&
        processedRunIdRef.current !== statusEvent.runId
      ) {
        processedRunIdRef.current = statusEvent.runId
        clearWatchdog()
        setRunId(null)
        setPublicToken(null)
        setStatusMessage(null)
      }
    }
  })

  async function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed || isSending) return

    setIsSending(true)

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId, content: trimmed }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      setDraft("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }

      await triggerDesignRun(trimmed)
    } catch {
      setMessages((current) => [
        ...current,
        {
          type: "ai-chat-message",
          sender: "Ghost AI",
          role: "assistant",
          content: "Something went wrong sending that message. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  async function triggerDesignRun(prompt: string) {
    const requestId = crypto.randomUUID()

    const designResponse = await fetch("/api/ai/design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, roomId, projectId: roomId, requestId }),
    })

    if (!designResponse.ok) {
      throw new Error("Failed to start design run")
    }

    const { runId: newRunId } = (await designResponse.json()) as { runId: string }

    const tokenResponse = await fetch("/api/ai/design/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: newRunId }),
    })

    if (!tokenResponse.ok) {
      throw new Error("Failed to authorize design run")
    }

    const { token } = (await tokenResponse.json()) as { token: string }

    processedRunIdRef.current = null
    setRunId(newRunId)
    setPublicToken(token)
    armWatchdog(newRunId)
  }

  async function generateSpec() {
    if (isGeneratingSpec || isSpecRunActive) return

    setIsGeneratingSpec(true)
    setSpecGenerationError(null)

    try {
      const chatHistory = messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role, content: message.content }))

      const specResponse = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          projectId: roomId,
          chatHistory,
          nodes: canvasNodes,
          edges: canvasEdges,
        }),
      })

      if (!specResponse.ok) {
        throw new Error("Failed to start spec generation")
      }

      const { runId: newRunId } = (await specResponse.json()) as { runId: string }

      const tokenResponse = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: newRunId }),
      })

      if (!tokenResponse.ok) {
        throw new Error("Failed to authorize spec generation")
      }

      const { token } = (await tokenResponse.json()) as { token: string }

      processedSpecRunIdRef.current = null
      specBaselineIdsRef.current = new Set(specs.map((item) => item.id))
      setSpecRunId(newRunId)
      setSpecPublicToken(token)

      clearSpecPolling()
      specPollRef.current = setInterval(() => {
        void pollForNewSpec(newRunId)
      }, SPEC_POLL_INTERVAL_MS)

      clearSpecWatchdog()
      specWatchdogRef.current = setTimeout(() => {
        if (processedSpecRunIdRef.current === newRunId) {
          return
        }
        processedSpecRunIdRef.current = newRunId
        finishSpecGeneration(false)
      }, SPEC_GENERATION_TIMEOUT_MS)
    } catch {
      setSpecGenerationError("Could not generate a spec. Please try again.")
    } finally {
      setIsGeneratingSpec(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void sendMessage(draft)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) {
      return
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendMessage(draft)
    }
  }

  return (
    <aside
      aria-hidden={!isOpen}
      aria-label="AI assistant"
      className={cn(
        "fixed top-[4.5rem] right-4 bottom-4 z-20 hidden w-96 flex-col rounded-2xl border border-surface-border bg-base/95 shadow-2xl backdrop-blur transition-transform duration-200 md:flex",
        isOpen ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
      )}
      inert={!isOpen}
    >
      <header className="flex items-center justify-between gap-2 border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-ai-text">
            <Bot className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-copy-primary">AI Workspace</span>
            <span className="text-xs text-copy-muted">Collaborate with Ghost AI</span>
          </div>
        </div>
        <Button
          aria-label="Close AI sidebar"
          onClick={onClose}
          size="icon-sm"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </header>

      <Tabs className="flex flex-1 flex-col overflow-hidden" defaultValue="architect">
        <div className="border-b border-surface-border px-4 py-2">
          <TabsList className="w-full">
            <TabsTrigger
              className="flex-1 data-active:bg-ai/15 data-active:text-ai-text"
              value="architect"
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              className="flex-1 data-active:bg-ai/15 data-active:text-ai-text"
              value="specs"
            >
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          className="flex flex-1 flex-col overflow-hidden data-[hidden]:hidden"
          value="architect"
        >
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-surface-subtle text-ai-text">
                  <Bot className="size-6" />
                </span>
                <p className="max-w-56 text-sm text-copy-muted">
                  Ask Ghost AI to design, explain, or extend your architecture.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      className="rounded-full bg-surface-subtle px-3 py-1.5 text-xs text-ai-text transition-colors hover:bg-surface-elevated"
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      type="button"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((message, index) => (
                  <div
                    className={cn(
                      "flex max-w-[85%] flex-col gap-1 rounded-xl px-3 py-2 text-sm",
                      message.role === "user"
                        ? "ml-auto bg-state-success text-background"
                        : "border border-surface-border bg-surface-elevated text-ai-text"
                    )}
                    key={`${message.createdAt}-${index}`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-copy-muted">{message.sender}</span>
                      <span className="text-[10px] text-copy-muted/70">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {message.content}
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            className="flex flex-col gap-2 border-t border-surface-border p-3"
            onSubmit={handleSubmit}
          >
            {isRunActive ? (
              <div className="flex items-center gap-2 rounded-lg border border-state-success/30 bg-surface-elevated px-3 py-1.5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-state-success opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-state-success" />
                </span>
                <p className="truncate text-xs text-copy-secondary">
                  {statusMessage ?? "Ghost AI is designing your architecture..."}
                </p>
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <Textarea
                className="max-h-40 min-h-[72px] flex-1 resize-none"
                disabled={isSending || isRunActive}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to build..."
                ref={textareaRef}
                value={draft}
              />
              <Button
                aria-label="Send message"
                className="bg-state-success text-background hover:bg-state-success/80 disabled:opacity-40"
                disabled={draft.trim().length === 0 || isSending || isRunActive}
                size="icon"
                type="submit"
              >
                {isSending || isRunActive ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent
          className="flex flex-1 flex-col overflow-hidden data-[hidden]:hidden"
          value="specs"
        >
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <Button
              className="w-full bg-ai text-white hover:bg-ai/80"
              disabled={isGeneratingSpec || isSpecRunActive}
              onClick={generateSpec}
              type="button"
            >
              {isGeneratingSpec || isSpecRunActive ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Spec"
              )}
            </Button>

            {specGenerationError ? (
              <p className="text-sm text-destructive" role="alert">
                {specGenerationError}
              </p>
            ) : null}

            {isLoadingSpecs ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-copy-muted" />
              </div>
            ) : specsError ? (
              <p className="py-8 text-center text-sm text-destructive" role="alert">
                {specsError}
              </p>
            ) : specs.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-surface-subtle text-ai-text">
                  <FileText className="size-6" />
                </span>
                <p className="max-w-56 text-sm text-copy-muted">
                  Generated specs for this project will show up here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {specs.map((spec) => (
                  <div
                    className="rounded-2xl border border-surface-border bg-surface-elevated p-4"
                    key={spec.id}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-ai-text">
                        <FileText className="size-4" />
                      </span>
                      <button
                        className="flex min-w-0 flex-1 flex-col gap-1 text-left"
                        onClick={() => setPreviewSpec(spec)}
                        type="button"
                      >
                        <span className="truncate text-sm font-medium text-copy-primary">
                          {spec.filename}
                        </span>
                        <p className="text-xs text-copy-muted">{formatSpecDate(spec.createdAt)}</p>
                      </button>
                      <Button
                        aria-label={`Download ${spec.filename}`}
                        onClick={() => downloadSpec(roomId, spec)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Download className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <SpecPreviewDialog
        onDownload={(spec) => downloadSpec(roomId, spec)}
        onOpenChange={(isOpen) => !isOpen && setPreviewSpec(null)}
        projectId={roomId}
        spec={previewSpec}
      />
    </aside>
  )
}

interface AiSidebarShellProps {
  isOpen: boolean
  onClose: () => void
}

function AiSidebarShell({ isOpen, onClose }: Readonly<AiSidebarShellProps>) {
  return (
    <aside
      aria-hidden={!isOpen}
      aria-label="AI assistant"
      className={cn(
        "fixed top-[4.5rem] right-4 bottom-4 z-20 hidden w-96 flex-col rounded-2xl border border-surface-border bg-base/95 shadow-2xl backdrop-blur transition-transform duration-200 md:flex",
        isOpen ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
      )}
      inert={!isOpen}
    >
      <header className="flex items-center justify-between gap-2 border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-ai-text">
            <Bot className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-copy-primary">AI Workspace</span>
            <span className="text-xs text-copy-muted">Collaborate with Ghost AI</span>
          </div>
        </div>
        <Button aria-label="Close AI sidebar" onClick={onClose} size="icon-sm" variant="ghost">
          <X className="size-4" />
        </Button>
      </header>
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-copy-muted">Connecting...</span>
      </div>
    </aside>
  )
}
