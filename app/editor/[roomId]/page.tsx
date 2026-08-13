import { redirect } from "next/navigation"

import { AccessDenied } from "@/components/editor/access-denied"
import { WorkspaceShell } from "@/components/editor/workspace-shell"
import { getCurrentIdentity, getProjectWithAccess } from "@/lib/project-access"
import { getUserProjects, toProjectDto } from "@/lib/projects"

interface EditorRoomPageProps {
  params: Promise<{ roomId: string }>
}

export default async function EditorRoomPage({ params }: Readonly<EditorRoomPageProps>) {
  const identity = await getCurrentIdentity()

  if (!identity) {
    redirect("/sign-in")
  }

  const { roomId } = await params
  const project = await getProjectWithAccess(roomId, identity)

  if (!project) {
    return <AccessDenied />
  }

  const { owned, shared } = await getUserProjects(identity.userId, identity.email)

  return (
    <WorkspaceShell
      activeProjectId={project.id}
      isOwner={project.ownerId === identity.userId}
      ownedProjects={owned}
      project={toProjectDto(project)}
      sharedProjects={shared}
    />
  )
}
