Wire up the AI sidebar so users can submit design prompts, track AI run status
in real time, and reflect AI-driven canvas updates through Liveblocks.

### Implementation

1. Submit from AI sidebar

- On submit:
  - push the user message to the `ai-chat` feed
  - generate a client request ID and resolve `projectId` from the active workspace's server-provided project data; call `POST /api/ai/design` with `{ prompt, roomId, projectId, requestId }`
  - read `{ runId }` from the response
  - call `POST /api/ai/design/token` with `{ runId }` and read `{ publicToken }`
- store `runId` and `publicToken` in local state; initialize `useRealtimeRun(runId, { accessToken: publicToken })` only after both responses succeed

The server enforces a unique authenticated-user/project/request-ID mapping. Duplicate design submissions reuse and return the existing `runId`, and `POST /api/ai/design/token` remains retryable for that run.

2. Run status tracking

- Use `useRealtimeRun(runId, { accessToken: publicToken })`
- While the run is active:
  - disable the chat input
  - show a loading state (spinner in the button is enough)
- When the run completes:
  - receive one validated terminal AI message from the authorized backend or task path; its payload includes `runId`, which must match the authorized TaskRun and its room-derived project
  - accept each terminal message only once, and reset loading and run state only for its matching active run so concurrent runs cannot affect another run’s UI

3. Canvas updates (realtime)

- Do not manually update nodes/edges
- Rely on Liveblocks (`useLiveblocksFlow`) to reflect changes in real time
- AI updates to nodes, edges, and presence should appear automatically

4. Status display

- Read the latest message from `ai-status-feed`
- Show a compact status strip above the input only when a run is active

### UI Details

- Use existing design tokens from `global.css` (do not introduce new colors)
- Follow `ui-context.md` for layout and visual consistency

Chat bubbles

- User: green accent background using the existing `--state-success` token, readable contrast text
- AI: dark background, light text

Submit button

- Enabled: green accent using the existing `--state-success` token
- Disabled: dimmed state
- While running: show spinner

Status strip

- Compact bar above input
- Dark base + green accent
- Subtle animated indicator is fine

General

- Use Tailwind + shadcn/ui only
- Keep current layout intact
- Show errors as messages in `ai-chat` feed

Client chat sends must derive the sender from the authenticated room session and must not set a role or timestamp. Assistant messages, including the final design response, are published only by an authorized backend or task path.

### Scope Limits

- Do not implement backend or Trigger.dev logic
- Do not fetch final graph data
- Do not redesign the sidebar
- Do not hardcode a new theme outside existing tokens
- Do not manually sync canvas state

---

### Notes

- Follow Liveblocks best practices for feeds (`ai-chat`, `ai-status-feed`)
- Keep everything collaborative, all updates should be visible across clients

---

### Check When Done

- Submitting a prompt calls `/api/ai/design` and returns a `runId`
- `useRealtimeRun` connects using the returned token
- Input is disabled while the run is active
- Status strip appears only during active runs
- Chat updates appear across multiple sessions
- No TypeScript or build errors
