"use client"

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { Bot, FileText, Send, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

const DEMO_SPEC = {
  title: "E-commerce Backend Spec",
  snippet:
    "Defines the service boundaries, data model, and API contracts for a catalog, cart, and checkout system...",
}

export function AiSidebar({ isOpen, onClose }: Readonly<AiSidebarProps>) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed) return

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
    ])
    setDraft("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    sendMessage(draft)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      sendMessage(draft)
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
                {messages.map((message) => (
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                      message.role === "user"
                        ? "ml-auto border-2 border-brand/50 bg-accent-dim text-copy-primary"
                        : "border border-surface-border bg-surface-elevated text-ai-text"
                    )}
                    key={message.id}
                  >
                    {message.content}
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            className="flex items-end gap-2 border-t border-surface-border p-3"
            onSubmit={handleSubmit}
          >
            <Textarea
              className="max-h-40 min-h-[72px] flex-1 resize-none"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build..."
              ref={textareaRef}
              value={draft}
            />
            <Button
              aria-label="Send message"
              className="bg-ai text-white hover:bg-ai/80"
              disabled={draft.trim().length === 0}
              size="icon"
              type="submit"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </TabsContent>

        <TabsContent
          className="flex flex-1 flex-col overflow-hidden data-[hidden]:hidden"
          value="specs"
        >
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <Button className="w-full bg-ai text-white hover:bg-ai/80" type="button">
              Generate Spec
            </Button>

            <div className="rounded-2xl border border-surface-border bg-surface-elevated p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-ai-text">
                  <FileText className="size-4" />
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-copy-primary">
                    {DEMO_SPEC.title}
                  </span>
                  <p className="text-xs text-copy-muted">{DEMO_SPEC.snippet}</p>
                  <Button
                    className="mt-2 w-fit"
                    disabled
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
