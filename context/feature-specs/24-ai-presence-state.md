Implement the full AI design agent so a user prompt results in real-time updates on the collaborative canvas, with visible AI presence and status.a

## Implementation

1. Update the design agent task in `trigger/design-agent.ts`.

   Before implementing:
   - check `context/project-overview.md` and `context/architecture-context.md` for product behavior and system rules
     -Before implementing, check Liveblocks and Trigger.dev agent skills for current patterns on canvas mutation and background task execution.
   - follow the existing Trigger.dev setup and agent patterns already in the project
   - reuse existing Liveblocks flow and presence patterns instead of creating new ones

   Then implement:
   - use Gemini (`@ai-sdk/google`) to interpret the user prompt
  - define typed schemas for every planned action, including node IDs, shape, color, flow coordinates, dimensions, update data, and edge endpoints
  - validate the complete Gemini plan against the existing canvas schema before any collaborative mutation utility runs; reject invalid or partial plans without mutating the room
   - update the canvas using the existing collaborative flow utilities
   - support actions like:
     - add node
     - move node
     - resize node
     - update node data
     - delete node
     - add edge
     - delete edge

  - give every canvas action a stable `runId` and action ID; key durable effect records by unique `(runId, actionId, effectType)` and track `pending` and `applied` states
  - atomically record `pending` before each node, edge, status-feed, or presence effect and mark it `applied` with the side effect; on retry, reconcile pending or ambiguous records against the actual Liveblocks node, edge, feed, or presence state
  - skip an effect only when it is confirmed `applied`; safely recheck or replay unresolved pending effects
  - publish AI activity to the shared status feed so all users see progress
   - update AI presence (cursor + thinking state) while the task runs
   - push clear status messages at key steps (start, processing, complete)

   - ensure generated designs follow:
     - allowed node shapes
     - color palette
     - layout and spacing rules

  - handle errors gracefully, publish a failure status when an error occurs, and preserve completion status for successful tasks
  - unconditionally clear AI presence in a `finally` path, including after Gemini or collaborative mutation failures

## Dependencies

All packages are already installed. Provision `GOOGLE_AI_API_KEY` in every deployed Trigger.dev environment and retain it in `.env.local` for local execution. Access the key only from server-side code.

## Scope Limits

- don’t change canvas architecture
- don’t introduce a new state system outside Liveblocks
- don’t bypass existing collaborative flow utilities

## Check When Done

- Design task updates the canvas through the existing collaborative flow.
- AI presence and status are visible to all participants.
- Status messages reflect task progress.
- Errors are handled without breaking the canvas.
- `npm run build` passes.
