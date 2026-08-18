"use client"

import { useEffect, useState } from "react"

export interface ProjectSpecSummary {
  id: string
  filename: string
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

export function useProjectSpecs(projectId: string, isEnabled: boolean) {
  const [specs, setSpecs] = useState<ProjectSpecSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!isEnabled) {
      return
    }

    let isCancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/projects/${projectId}/specs`)

        if (!response.ok) {
          throw new Error(await parseErrorMessage(response, "Could not load specs."))
        }

        const body = await response.json()
        if (!isCancelled) {
          setSpecs(body.specs)
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
  }, [isEnabled, projectId, reloadToken])

  function reload() {
    setReloadToken((current) => current + 1)
  }

  return { error, isLoading, reload, specs }
}
