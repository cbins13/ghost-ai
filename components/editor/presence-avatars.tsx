"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import { useOthers } from "@liveblocks/react"

const MAX_VISIBLE_AVATARS = 5

function initialsFor(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?"
}

interface CollaboratorAvatarProps {
  avatar: string
  color: string
  name: string
}

function CollaboratorAvatar({ avatar, color, name }: Readonly<CollaboratorAvatarProps>) {
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={name}
        className="h-8 w-8 shrink-0 rounded-full border-2 border-surface object-cover"
        src={avatar}
        title={name}
      />
    )
  }

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-surface text-xs font-medium text-copy-primary"
      aria-label={name}
      role="img"
      style={{ backgroundColor: color }}
      title={name}
    >
      {initialsFor(name)}
    </div>
  )
}

export function PresenceAvatars() {
  const { user } = useUser()
  const others = useOthers()
  const collaborators = others.filter((other) => other.id !== user?.id)
  const visibleCollaborators = collaborators.slice(0, MAX_VISIBLE_AVATARS)
  const overflowCount = collaborators.length - visibleCollaborators.length

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-full border border-surface-border bg-surface/90 px-2 py-1.5 shadow-lg backdrop-blur">
      {collaborators.length > 0 ? (
        <>
          <div className="flex items-center -space-x-2">
            {visibleCollaborators.map((other) => (
              <CollaboratorAvatar
                avatar={other.info.avatar}
                color={other.info.color}
                key={other.connectionId}
                name={other.info.name}
              />
            ))}
            {overflowCount > 0 ? (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-surface-elevated text-xs font-medium text-copy-muted">
                +{overflowCount}
              </div>
            ) : null}
          </div>
          <div aria-hidden className="h-6 w-px bg-border-default" />
        </>
      ) : null}
      <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
    </div>
  )
}
