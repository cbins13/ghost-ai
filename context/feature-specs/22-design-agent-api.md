Set up the backend flow for design generation using Trigger.dev.
This unit handles triggering background jobs, tracking runs, and issuing tokens. No AI logic yet.

## Implementation

1. Add the design trigger route.

   Create: `POST /api/ai/design`
   This route should:
   - accept the design prompt, `roomId`, and client context `projectId`, but do not trust the supplied project ID
   - require authentication, derive the authoritative project from `roomId`, and reject a supplied `projectId` that does not match before authorizing access
   - trigger the design task through Trigger.dev
   - create a TaskRun record
   - return the run ID to the client

2. Add task run tracking.

   Create a `TaskRun` model in Prisma to track Trigger.dev runs and verify ownership.

   It should include:
   - `runId` (unique)
   - `projectId`
   - `userId`
   - `createdAt`

   Add:
   - an index on `runId`
   - a compound index on `userId` and `projectId`

3. Add the token route.

   Create: `POST /api/ai/design/token`
   This route should:
   - accept a run ID
   - require authentication, load the TaskRun, and re-authorize the requester’s current owner-or-collaborator access to `TaskRun.projectId`; do not rely only on `TaskRun.userId`
   - use Trigger.dev’s public-token API to issue a run-specific read-scoped token only after authorization succeeds
   - set an explicit one-hour token expiration and return the token

4. Create the design task.

   Create `trigger/design-agent.ts`
   - check the existing Trigger.dev setup and installed agent features first
   - reuse the existing setup instead of creating a new pattern
   - export a minimal design task
   - accept the expected payload (`prompt`, `roomId`)
   - do not log raw prompts; log only safe request metadata
   - don’t add AI logic yet

## Scope Limits

- don’t generate nodes or edges yet
- don’t call any AI providers
- don’t update the canvas
- keep this focused on backend task wiring only
- enforce authenticated access and room-derived project ownership in all design and token route flows

## Dependencies

- Add `@trigger.dev/sdk` to `package.json` for task triggering and run-scoped public-token issuance.

## Check When Done

- `POST /api/ai/design` triggers a background task.
- Task runs are stored in Prisma.
- `POST /api/ai/design/token` returns a run-scoped token.
- Design task exists and is callable.
- `npm run build` passes.
