"use client"

import { useEffect, useRef, useState, type SyntheticEvent } from "react"
import { Check, Copy, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useCollaborators } from "@/hooks/use-collaborators"

interface ShareDialogProps {
  isOpen: boolean
  isOwner: boolean
  onOpenChange: (isOpen: boolean) => void
  projectId: string
  projectName: string
}

function initialsFor(name: string | null, email: string) {
  const source = name?.trim() || email
  return source.slice(0, 1).toUpperCase()
}

export function ShareDialog({ isOpen, isOwner, onOpenChange, projectId, projectName }: Readonly<ShareDialogProps>) {
  const { collaborators, error, inviteCollaborator, isInviting, isLoading, removeCollaborator } = useCollaborators(
    projectId,
    isOpen
  )
  const [email, setEmail] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current)
      }
    }
  }, [])

  async function handleInvite(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim()) {
      return
    }

    const succeeded = await inviteCollaborator(email.trim())

    if (succeeded) {
      setEmail("")
    }
  }

  async function handleCopyLink() {
    const link = `${window.location.origin}/editor/${projectId}`

    try {
      await navigator.clipboard.writeText(link)
      setCopyError(null)
      setIsCopied(true)
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current)
      }
      copyResetTimeoutRef.current = setTimeout(() => setIsCopied(false), 2000)
    } catch {
      setCopyError("Could not copy the project link.")
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent className="rounded-3xl bg-surface p-6">
        <DialogHeader>
          <DialogTitle>Share {projectName}</DialogTitle>
          <DialogDescription className="text-copy-muted">
            {isOwner
              ? "Invite collaborators by email. They'll get read access to this workspace."
              : "People with access to this workspace."}
          </DialogDescription>
        </DialogHeader>

        {isOwner ? (
          <form className="flex gap-2" onSubmit={handleInvite}>
            <Input
              aria-label="Collaborator email"
              disabled={isInviting}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
              type="email"
              value={email}
            />
            <Button disabled={isInviting || !email.trim()} type="submit">
              {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
            </Button>
          </form>
        ) : null}

        {error || copyError ? (
          <p className="text-sm text-destructive" role="alert">
            {error ?? copyError}
          </p>
        ) : null}

        <div className="grid max-h-64 gap-2 overflow-y-auto">
          {isLoading ? (
            <p className="py-4 text-center text-sm text-copy-muted">Loading collaborators...</p>
          ) : collaborators.length === 0 ? (
            <p className="py-4 text-center text-sm text-copy-muted">No collaborators yet.</p>
          ) : (
            collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-elevated px-3 py-2"
              >
                {collaborator.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                    src={collaborator.avatarUrl}
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-dim text-xs font-medium text-brand">
                    {initialsFor(collaborator.name, collaborator.email)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-copy-primary">
                    {collaborator.name ?? collaborator.email}
                  </p>
                  {collaborator.name ? (
                    <p className="truncate text-xs text-copy-muted">{collaborator.email}</p>
                  ) : null}
                </div>
                {isOwner ? (
                  <Button
                    aria-label={`Remove ${collaborator.email}`}
                    className="shrink-0"
                    onClick={() => removeCollaborator(collaborator.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl bg-surface-elevated sm:justify-start">
          <Button onClick={handleCopyLink} type="button" variant="outline">
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {isCopied ? "Copied!" : "Copy link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
