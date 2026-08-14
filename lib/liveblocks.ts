import { Liveblocks } from "@liveblocks/node";

declare global {
  var liveblocksGlobal: Liveblocks | undefined;
}

function createLiveblocksClient(): Liveblocks {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not set.");
  }

  return new Liveblocks({ secret });
}

export function getLiveblocksClient(): Liveblocks {
  const client = global.liveblocksGlobal ?? createLiveblocksClient();

  if (process.env.NODE_ENV === "development") {
    global.liveblocksGlobal = client;
  }

  return client;
}

// Vivid colors from the canvas node palette, reused for cursor identity.
const CURSOR_COLORS = [
  "#52A8FF",
  "#BF7AF0",
  "#FF990A",
  "#FF6166",
  "#F75F8F",
  "#62C073",
  "#0AC7B4",
  "#00C8D4",
] as const;

export function getCursorColorForUser(userId: string): string {
  let hash = 0;

  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }

  const index = Math.abs(hash) % CURSOR_COLORS.length;

  return CURSOR_COLORS[index];
}
