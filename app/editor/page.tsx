import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { EditorHome } from "@/components/editor/editor-home"
import { getVerifiedPrimaryEmail } from "@/lib/project-access"
import { getUserProjects } from "@/lib/projects"

export default async function EditorPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const user = await currentUser()
  const { owned, shared } = await getUserProjects(userId, getVerifiedPrimaryEmail(user))

  return <EditorHome ownedProjects={owned} sharedProjects={shared} />
}
