Add shared AI activity indicators so everyone in the room can see when generation is in progress. This unit is only for UI, presence, and realtime status signals. Do not add the actual AI generation flow yet.

## Implementation

1. Add AI thinking state to the sidebar.
   - show a small status indicator when AI is working
   - make the status visible to everyone in the room
   - disable the chat input while generation is active
   - show a loading state on the send button
   - keep the rest of the sidebar usable

2. Add a shared AI status feed.
   - check the existing Liveblocks setup and installed agent-related features first
   - follow Liveblocks best practices for feeds/presence instead of creating parallel realtime state
   - create or reuse a Liveblocks feed named `ai-status-feed`
   - filter feed messages by the active `runId`, then select the latest matching message by Liveblocks timestamp in the sidebar
   - show only that most recent matching status message; hide or clear the status strip when no message matches the active run
   - keep the feed generic enough for design and spec generation later

3. Add status message validation.
   - define the feed payload schema in `types/tasks.ts`
   - the payload must include `runId` and an explicit `status` value, and may include an optional `text` field
   - validate incoming messages before displaying them
   - publish status only from an authorized backend or task path, ignoring client-supplied actor identity; use Liveblocks message timestamps to select the latest status message

4. Add thinking indicators to live cursors.
   - when a participant has `thinking: true` in presence, show a small spinner in their cursor name badge
   - hide the spinner when `thinking` is false or missing

## Scope Limits

- don’t add actual AI generation logic
- don’t trigger background tasks yet
- don’t block or dim the whole sidebar
- don’t show full feed history
- keep this focused on shared AI activity state only

## Check When Done

- Sidebar can render shared AI status from `ai-status-feed`.
- Chat input and send button respond to active generation state.
- Cursor badges read `thinking` from presence.
- Feed messages are validated through the task schema.
- `npm run build` passes.
