import Link from "next/link"
import { Lock } from "lucide-react"

export function AccessDenied() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base px-6 text-center text-copy-primary">
      <Lock className="h-8 w-8 text-copy-faint" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">You don&apos;t have access to this project</h1>
        <p className="text-sm text-copy-muted">
          Ask the project owner to share it with you, or return to your projects.
        </p>
      </div>
      <Link className="text-sm font-medium text-brand hover:underline" href="/editor">
        Back to projects
      </Link>
    </main>
  )
}
