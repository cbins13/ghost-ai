"use client"

import { useEffect, useState } from "react"

export interface CollaboratorDto {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
}

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json()
    return typeof body?.error?.message === "string" ? body.error.message : fallback
  } catch {
    return fallback
  }
}

export function useCollaborators(projectId: string, isEnabled: boolean) {
  const [collaborators, setCollaborators] = useState<CollaboratorDto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEnabled) {
      return
    }

    let isCancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/projects/${projectId}/collaborators`)

        if (!response.ok) {
          throw new Error(await parseErrorMessage(response, "Could not load collaborators."))
        }

        const body = await response.json()
        if (!isCancelled) {
          setCollaborators(body.collaborators)
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
  }, [isEnabled, projectId])

  async function inviteCollaborator(email: string) {
    setIsInviting(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, "Could not invite this collaborator."))
      }

      const body = await response.json()
      setCollaborators(body.collaborators)
      return true
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Something went wrong.")
      return false
    } finally {
      setIsInviting(false)
    }
  }

  async function removeCollaborator(collaboratorId: string) {
    setError(null)
    let removedCollaborator: CollaboratorDto | undefined
    setCollaborators((current) => {
      removedCollaborator = current.find((collaborator) => collaborator.id === collaboratorId)
      return current.filter((collaborator) => collaborator.id !== collaboratorId)
    })

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators/${collaboratorId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, "Could not remove this collaborator."))
      }
    } catch (removeError) {
      setCollaborators((current) => {
        if (!removedCollaborator || current.some((collaborator) => collaborator.id === collaboratorId)) {
          return current
        }

        return [...current, removedCollaborator].sort((first, second) => first.createdAt.localeCompare(second.createdAt))
      })
      setError(removeError instanceof Error ? removeError.message : "Could not remove this collaborator.")
    }
  }

  return {
    collaborators,
    error,
    inviteCollaborator,
    isInviting,
    isLoading,
    removeCollaborator,
  }
}
