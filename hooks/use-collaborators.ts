"use client"

import { useEffect, useRef, useState } from "react"

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
  const activeProjectIdRef = useRef(projectId)
  const mutationGenerationRef = useRef(0)
  const pendingRemovalIdsRef = useRef(new Map<string, symbol>())

  function applyCollaboratorSnapshot(snapshot: CollaboratorDto[], snapshotProjectId: string, generation: number) {
    if (snapshotProjectId !== activeProjectIdRef.current || generation < mutationGenerationRef.current) {
      return
    }

    setCollaborators(snapshot.filter((collaborator) => !pendingRemovalIdsRef.current.has(collaborator.id)))
  }

  useEffect(() => {
    activeProjectIdRef.current = projectId
    pendingRemovalIdsRef.current.clear()
    mutationGenerationRef.current += 1
  }, [projectId])

  useEffect(() => {
    if (!isEnabled) {
      return
    }

    const readGeneration = mutationGenerationRef.current

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
          applyCollaboratorSnapshot(body.collaborators, projectId, readGeneration)
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
    const invitationProjectId = projectId
    const readGeneration = mutationGenerationRef.current
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
      applyCollaboratorSnapshot(body.collaborators, invitationProjectId, readGeneration)
      return true
    } catch (inviteError) {
      if (invitationProjectId === activeProjectIdRef.current) {
        setError(inviteError instanceof Error ? inviteError.message : "Something went wrong.")
      }
      return false
    } finally {
      setIsInviting(false)
    }
  }

  async function removeCollaborator(collaboratorId: string) {
    if (pendingRemovalIdsRef.current.has(collaboratorId)) {
      return
    }

    const removalProjectId = projectId
    const removalToken = Symbol(collaboratorId)
    setError(null)
    pendingRemovalIdsRef.current.set(collaboratorId, removalToken)
    const removedCollaborator = collaborators.find((collaborator) => collaborator.id === collaboratorId)
    setCollaborators((current) => current.filter((collaborator) => collaborator.id !== collaboratorId))

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators/${collaboratorId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, "Could not remove this collaborator."))
      }
    } catch (removeError) {
      if (
        removalProjectId !== activeProjectIdRef.current ||
        pendingRemovalIdsRef.current.get(collaboratorId) !== removalToken
      ) {
        return
      }

      pendingRemovalIdsRef.current.delete(collaboratorId)
      setCollaborators((current) => {
        if (!removedCollaborator || current.some((collaborator) => collaborator.id === collaboratorId)) {
          return current
        }

        return [...current, removedCollaborator].sort((first, second) => first.createdAt.localeCompare(second.createdAt))
      })
      setError(removeError instanceof Error ? removeError.message : "Could not remove this collaborator.")
      return
    }

    if (
      removalProjectId === activeProjectIdRef.current &&
      pendingRemovalIdsRef.current.get(collaboratorId) === removalToken
    ) {
      pendingRemovalIdsRef.current.delete(collaboratorId)
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
