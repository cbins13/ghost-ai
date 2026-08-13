import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentIdentity, getProjectWithAccess } from "@/lib/project-access";
import { getCursorColorForUser, getLiveblocksClient } from "@/lib/liveblocks";
import { forbidden, internalError, unauthorized } from "@/lib/api-response";

const ROOM_PROVISION_ATTEMPTS = 3;
const ROOM_PROVISION_BASE_DELAY_MS = 200;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureRoomExists(roomId: string): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < ROOM_PROVISION_ATTEMPTS; attempt++) {
    try {
      await getLiveblocksClient().getOrCreateRoom(roomId, { defaultAccesses: [] });
      return;
    } catch (error) {
      lastError = error;

      if (attempt < ROOM_PROVISION_ATTEMPTS - 1) {
        await delay(ROOM_PROVISION_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }

  throw lastError;
}

export async function POST(request: NextRequest) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const projectId = typeof body?.room === "string" ? body.room : null;

  if (!projectId) {
    return forbidden("A valid room is required.");
  }

  const project = await getProjectWithAccess(projectId, identity);

  if (!project) {
    return forbidden();
  }

  try {
    await ensureRoomExists(project.id);
  } catch (error) {
    console.error("Failed to provision Liveblocks room", error);
    return internalError("Could not set up the collaboration session. Please try again.");
  }

  const user = await currentUser();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  const displayName = name || identity.email || identity.userId;

  const session = getLiveblocksClient().prepareSession(identity.userId, {
    userInfo: {
      name: displayName,
      avatar: user?.imageUrl ?? "",
      color: getCursorColorForUser(identity.userId),
    },
  });

  session.allow(project.id, session.FULL_ACCESS);

  const { status, body: responseBody } = await session.authorize();

  return new NextResponse(responseBody, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
