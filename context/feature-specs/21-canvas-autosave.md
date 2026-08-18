Add autosave and loading for the collaborative canvas so project state is persisted before adding AI generation Canvas JSON should be stored in Vercel Blob, and the trusted private Blob pathname/key should be stored on the Prisma project record.

## What to Install

- `@vercel/blob`

## Implementation

1. Check the existing project schema.
   - review `prisma/models/project.prisma`
   - add or reuse fields for a trusted private canvas Blob pathname/key and canvas revision
   - keep Prisma responsible for metadata only

2. Add canvas save/load API routes.
   Create: `PUT /api/projects/[projectId]/canvas`
   This route should:
   - require Clerk authentication and verify the user is the project owner or a collaborator before reading or writing
   - receive the latest canvas JSON and client revision
   - upload the JSON to a private Vercel Blob and retain only its trusted pathname/key
   - atomically compare the stored revision with the client revision, updating both Blob reference and incremented revision only when they match
   - return `200` with `{ "canvas": CanvasState, "revision": number }` after a successful write
   - return `409` with the authoritative `{ "canvas": CanvasState, "revision": number }` when the revision does not match

   Create: `GET /api/projects/[projectId]/canvas`
   This route should:
   - require Clerk authentication and verify the user is the project owner or a collaborator before reading
   - read the project’s trusted private Blob pathname/key and revision from Prisma
   - retrieve the snapshot server-side with `get(pathname, { access: "private" })`
   - return only `{ "canvas": CanvasState, "revision": number }`, never the Blob URL or private key

   Return `401` when unauthenticated and `403` when an authenticated user lacks project access.

3. Add an autosave hook in the `/hook` folder.
   - watch the canvas nodes and edges
   - debounce saves to avoid excessive writes
   - save through the canvas API route
   - track save status: saving, saved, error
   - send the last known revision with every PUT; on `409`, use the returned authoritative canvas/revision, reconcile through Liveblocks, and retry only from the latest synchronized state

   The server uses an atomic compare-and-set update for the Blob reference and revision, so concurrent collaborators cannot overwrite a newer debounced snapshot with an older one.

4. Load saved canvas state in the editor.
   - wait for `useLiveblocksFlow({ suspense: true })` to synchronize nodes and edges before checking whether the room is empty
   - after the synchronized empty-room check, request the saved canvas with the authoritative room revision and apply it through a server-side conditional operation only when that revision still represents a room with no nodes and no edges
   - do not rely only on a client-side recheck; a concurrent Liveblocks update must make the conditional load fail without applying the snapshot
   - if the room already has nodes or edges, skip the load entirely to avoid overwriting active collaboration

5. Add a small save status indicator in the editor Save button.
   - show saving, saved, or error states

## Storage Pattern

- Prisma stores project metadata, the private canvas Blob pathname/key, and revision.
- Vercel Blob stores the actual canvas JSON.

## Check When Done

- `@vercel/blob` is installed.
- Project schema supports storing the trusted private canvas Blob pathname/key.
- Save/load routes use Prisma for metadata and Vercel Blob for canvas JSON.
- Autosave hook debounces canvas saves.
- Editor shows save status.
- Saved canvas does not load if the room already has
  active nodes or edges
- `npm run build` passes.
