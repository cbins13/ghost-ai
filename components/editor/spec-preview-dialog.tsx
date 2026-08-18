"use client"

import { useEffect, useState } from "react"
import { Download, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ProjectSpecSummary } from "@/hooks/use-project-specs"

interface SpecPreviewDialogProps {
  onDownload: (spec: ProjectSpecSummary) => void
  onOpenChange: (isOpen: boolean) => void
  projectId: string
  spec: ProjectSpecSummary | null
}

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json()
    return typeof body?.error?.message === "string" ? body.error.message : fallback
  } catch {
    return fallback
  }
}

export function SpecPreviewDialog({ onDownload, onOpenChange, projectId, spec }: Readonly<SpecPreviewDialogProps>) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!spec) {
      return
    }

    let isCancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      setContent(null)

      try {
        const response = await fetch(`/api/projects/${projectId}/specs/${spec!.id}/download`)

        if (!response.ok) {
          throw new Error(await parseErrorMessage(response, "Could not load this spec."))
        }

        const text = await response.text()
        if (!isCancelled) {
          setContent(text)
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "Something went wrong.")
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isCancelled = true
    }
  }, [projectId, spec])

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setContent(null)
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={Boolean(spec)}>
      <DialogContent className="flex h-[80vh] w-[min(92vw,42rem)] max-w-2xl! flex-col overflow-hidden rounded-3xl bg-surface p-6">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            <span className="text-copy-primary" style={{ color: "#f0f0f4" }}>
              {spec?.filename}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-copy-muted" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <ScrollArea className="min-h-0 min-w-0 flex-1 rounded-xl border border-surface-border bg-surface-elevated p-4">
            <article
              className="flex min-w-0 flex-col gap-3 break-words text-sm text-copy-primary [&_a]:text-ai-text [&_a]:underline [&_code]:rounded [&_code]:bg-surface-subtle [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:break-words [&_h1]:text-[1rem] [&_h1]:pl-2 [&_h1]:text-copy-primary [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_li]:ml-4 [&_ol]:list-decimal [&_p]:text-copy-secondary [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-subtle [&_pre]:p-3 [&_ul]:list-disc"
            >
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>
            </article>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            disabled={!spec}
            onClick={() => spec && onDownload(spec)}
            type="button"
            variant="outline"
          >
            <Download className="size-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
