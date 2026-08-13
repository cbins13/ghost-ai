# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Completed: Feature Unit 12

## Current Goal

- Build custom node/edge rendering and canvas controls on top of the collaborative canvas foundation.

## Completed

- Project scaffold created with Next.js 16, React 19, and Tailwind CSS 4.

### Feature Unit 01: Design System

- Installed and configured shadcn/ui.
- Added shadcn primitives: Button, Card, Dialog, Input, Tabs, Textarea, Scroll Area.
- Installed lucide-react.
- Added lib/utils.ts with reusable cn() helper.
- Replaced generated default theme tokens with dark-only global tokens aligned to UI context.
- Verified component imports and build health via npm run lint.

### Feature Unit 02: Editor Chrome

- Added a reusable editor navbar with a state-aware project sidebar toggle.
- Added a floating, animated project sidebar with My Projects and Shared tabs.
- Added empty project states and a full-width New Project action.
- Confirmed existing dialog primitives support token-based titles, descriptions, and footer actions.
- Verified editor chrome lint health via npm run lint.

### Feature Unit 03: Authentication

- Initialized Clerk for the linked Ghost AI development instance.
- Configured Clerk provider theming with the shadcn theme and existing dark tokens.
- Added protected-by-default proxy behavior, public sign-in/sign-up routes, and Clerk proxy matching.
- Added responsive sign-in and sign-up pages plus the editor user menu.
- Redirected the root route by auth state and moved the editor shell to `/editor`.
- Verified Clerk diagnostics and lint; the production build remains blocked by an unrelated existing type error in `components/editor/project-sidebar.tsx`.

### Feature Unit 04: Project Dialogs & Editor Home

- Added the centered editor home action and project creation entry point.
- Added mock owned and shared project data, with rename and delete actions restricted to owned projects.
- Added create, rename, and destructive delete dialogs backed by a dedicated dialog state hook.
- Added live project slug preview, rename autofocus and Enter submission, loading states, and a mobile sidebar scrim.
- Verified lint and strict TypeScript checks.

### Feature Unit 05: Prisma Schema And Data Layer

- Added `prisma/models/project.prisma` with `Project` (owner ID as external Clerk ID, status enum, canvas path, indexes on `ownerId`/`createdAt`) and `ProjectCollaborator` (cascade delete, unique `[projectId, email]`, indexes on `email` and `[projectId, createdAt]`).
- Installed `@prisma/client`, `@prisma/adapter-pg`, and `pg`, which were listed as installed in the spec but were missing from `package.json`.
- Added `lib/prisma.ts` as a cached singleton, branching on `DATABASE_URL`: `prisma+postgres://` uses Prisma's built-in `accelerateUrl` option, otherwise a `@prisma/adapter-pg` driver adapter is used. Cached on `global` in development.
- Ran `prisma migrate dev` (migration `20260812085617_init_project_models`) against the configured database and generated the client.
- Verified `npm run build` passes.

### Feature Unit 06: Project APIs

- Added `app/api/projects/route.ts` with `GET` (returns `{ owned, shared }`, `shared` resolved via `ProjectCollaborator.email` matched against the caller's Clerk primary email) and `POST` (trims name, defaults empty/whitespace-only to `Untitled Project`, rejects names over 120 characters).
- Added `app/api/projects/[projectId]/route.ts` with `PATCH` (rename, no creation default, rejects empty or over-length names) and `DELETE`, both enforcing owner-only access (`403` for non-owners, `404` for missing projects).
- Added `lib/api-response.ts` for the shared `{ error: { code, message } }` JSON error shape (401/400/403/404/409/500).
- Added `lib/projects.ts` with `toProjectDto`, `resolveCreateName`, and `resolveRenameName` shared between routes.
- Verified `npm run build` passes.

### Feature Unit 07: Wire Editor Home

- Added `lib/projects.ts#getUserProjects(userId, email)`, shared between `GET /api/projects` and the editor home server component so both use the same owned/shared query logic.
- Converted `app/editor/page.tsx` into a server component: it resolves the Clerk user, fetches owned/shared projects server-side via `getUserProjects`, and redirects unauthenticated visitors to `/sign-in`. No client-side fetch on initial load.
- Added `components/editor/editor-home.tsx` as the client component holding sidebar-open state and dialog wiring, rendering the server-fetched project lists directly (no duplicated client-side project state).
- Added `hooks/use-project-actions.ts`, replacing the mock `components/editor/use-project-dialogs.ts` (deleted). Manages dialog state and calls the real API: `POST /api/projects` then `router.push` to `/editor/[id]` using the server-generated ID; `PATCH` then `router.refresh()`; `DELETE` then `router.push("/editor")` if the deleted project is the active workspace (via an optional `activeProjectId` option, unused for now since no project workspace route exists yet) or `router.refresh()` otherwise. Surfaces request failures as an inline dialog error.
- Updated `components/editor/project-sidebar.tsx` and `components/editor/project-dialogs.tsx` to use the hook's `ProjectSummary` type instead of the removed `MockProject` type; `ProjectDialogs` now accepts and displays an `error` string.
- Verified `npm run build` and `npm run lint` pass.

### Feature Unit 08: Edit Workspace Shell

- Added `lib/project-access.ts` with `getCurrentIdentity()` (Clerk `userId` + primary email) and `getProjectWithAccess(projectId, identity)`, which returns the project for the owner or a matching `ProjectCollaborator` (looked up via the `projectId_email` unique constraint, email canonicalized with `trim().toLowerCase()`), or `null` otherwise.
- Added `components/editor/access-denied.tsx`: centered layout, lock icon, short message, link back to `/editor`.
- Added `app/editor/[roomId]/page.tsx` as a server component: redirects unauthenticated visitors to `/sign-in`, renders `AccessDenied` for missing or unauthorized projects, otherwise fetches the caller's owned/shared project lists via the existing `getUserProjects` and renders the workspace shell.
- Added `components/editor/workspace-shell.tsx` (client) composing the navbar, `ProjectSidebar`, a canvas placeholder section, and a right-side AI sidebar placeholder toggled from the navbar. Reuses `useProjectActions` with `activeProjectId` so deleting the open project redirects to `/editor`; opening a different project from the sidebar does a client-side `router.push` to its room route.
- Added `components/editor/workspace-navbar.tsx`: sidebar toggle, centered project name, share button (inert placeholder), AI sidebar toggle, `UserButton`.
- Updated `components/editor/project-sidebar.tsx` to accept an optional `activeProjectId` and highlight the matching project row (`aria-current` + `bg-accent-dim`), used by both the workspace shell and (harmlessly, since it's unset there) editor home.
- Updated `components/editor/editor-home.tsx`'s `openProject` to `router.push` to `/editor/[projectId]` now that the route exists, replacing the earlier close-sidebar-only stub.
- No Liveblocks, AI chat, or sharing behavior implemented yet — canvas and AI sidebar are static placeholders per spec scope.
- Verified `npm run build` and `npm run lint` pass.

### Feature Unit 09: Share Dialog

- Added `lib/collaborators.ts` with `getEnrichedCollaborators(projectId)`, which loads `ProjectCollaborator` rows and enriches them with Clerk profile data (`clerkClient().users.getUserList({ emailAddress })`, matched case-insensitively against each user's email addresses); falls back to email-only display per collaborator if the Clerk lookup fails or no match is found. Also exports `isValidEmail`.
- Added `app/api/projects/[projectId]/collaborators/route.ts`: `GET` requires an authenticated session and owner-or-collaborator access via `getProjectWithAccess` (401/404, no `403` distinction — matches the existing indistinguishable-404 policy already used for project access); `POST` requires session + owner ownership check (403 for non-owners), validates and normalizes the email, rejects inviting the owner's own email or an existing collaborator (400/409), then returns the refreshed enriched list.
- Added `app/api/projects/[projectId]/collaborators/[collaboratorId]/route.ts` with `DELETE`, owner-only (403 for non-owners), 404 if the collaborator doesn't belong to the project.
- Added `hooks/use-collaborators.ts`: loads collaborators on dialog open (effect-scoped async load with a cancellation flag to satisfy the `react-hooks/set-state-in-effect` lint rule), plus `inviteCollaborator` and an optimistic `removeCollaborator` that rolls back on failure.
- Added `components/editor/share-dialog.tsx`: invite form (owner only), collaborator list with Clerk avatar/name fallback to initials/email, remove button (owner only), and a copy-link button with temporary "Copied!" feedback.
- Wired a `Share` button click handler through `components/editor/workspace-navbar.tsx` (`onShareClick` prop) and dialog open state in `components/editor/workspace-shell.tsx`. Added an `isOwner` prop to `WorkspaceShell`, computed in `app/editor/[roomId]/page.tsx` as `project.ownerId === identity.userId` and passed to `ShareDialog` to gate invite/remove UI.
- No local user table added; collaborator identity enrichment is a live Clerk Backend API call per share-dialog open, not cached or persisted.
- Hardened project and collaborator flows with cancellable requests, verified-email-only invitation matching, batched Clerk profile lookups, safe optimistic rollback, and clipboard failure handling.
- Added durable idempotency keys for project mutations and protected optimistic collaborator removals from stale list and invite snapshots.
- Hardened collaborator mutation concurrency across project changes and bound idempotent mutation replays to normalized request fingerprints.
- At revision `6b5727d` (2026-08-13), `npm run build` passed; `npm run lint` failed with the known `react-hooks/set-state-in-effect` violation in `components/editor/share-dialog.tsx`.

### Feature Unit 10: Liveblocks Setup

- Defined `liveblocks.config.ts`: `Presence` (`cursor: {x,y} | null`, `isThinking: boolean`) and `UserMeta` (`id`, `info: { name, avatar, color }`). Unused scaffold fields (`Storage`, `RoomEvent`, `ThreadMetadata`, `RoomInfo`) typed as `Record<string, never>` to satisfy strict lint instead of `{}`.
- Installed `@liveblocks/node` (`^3.23.1`), which the spec assumed was already installed but was missing from `package.json`/`node_modules` — required for server-side room provisioning and session token creation.
- Added `lib/liveblocks.ts`: `getLiveblocksClient()` lazily constructs and caches a `Liveblocks` node client on `global` (mirrors `lib/prisma.ts`'s caching pattern), only reading `LIVEBLOCKS_SECRET_KEY` at call time so route collection during `npm run build` doesn't fail before the secret is configured. Also exports `getCursorColorForUser(userId)`, a deterministic hash into the existing 8-color canvas node text palette from `context/ui-context.md`.
- Added `app/api/liveblocks-auth/route.ts` (`POST`): requires Clerk auth via `getCurrentIdentity()`, verifies project access via `getProjectWithAccess()` (`403` if unauthorized or missing `room` in the body), provisions the room with `getOrCreateRoom` (project ID as room ID, empty `defaultAccesses`) retried up to 3 times with exponential backoff, and returns `500` without issuing a session token if provisioning still fails after retries. On success, builds a session via `prepareSession` with name/avatar from Clerk's `currentUser()` and the deterministic cursor color, grants full access to the room, and returns the Liveblocks `authorize()` response body/status directly.
- Added `LIVEBLOCKS_SECRET_KEY=` placeholder to `.env.local` — **the user must fill in a real secret key from the Liveblocks dashboard before the auth route will work at runtime.**
- No client-side `LiveblocksProvider`/room wiring added yet — this unit is server-side setup only, matching the spec's scope.
- At the time of this unit, `npm run build` passed while `npm run lint` had the known Unit 09 `react-hooks/set-state-in-effect` failure in `components/editor/share-dialog.tsx`; that failure was resolved after Unit 11.

### Feature Unit 11: Base Canvas

- Added `types/canvas.ts`: `CanvasNodeShape`, `NODE_COLORS`/`DEFAULT_NODE_COLOR` and `NODE_SHAPES` (matching the 8-color palette and 6 shapes documented in `context/ui-context.md`), `CanvasNodeData` (`label`, `color`, `textColor`, `shape`), `CanvasEdgeData` (optional `label`), and the `CanvasNode`/`CanvasEdge` type aliases (`Node<CanvasNodeData, "canvasNode">` / `Edge<CanvasEdgeData, "canvasEdge">`). Resized `width`/`height` persist automatically — they're standard `@xyflow/react` `Node` fields, not excluded by `useLiveblocksFlow`'s base sync config, so no extra handling was needed.
- Added `components/editor/canvas.tsx` (client): `Canvas` composes `LiveblocksProvider` (`authEndpoint="/api/liveblocks-auth"`) → `RoomProvider` (`id={roomId}`, `initialPresence={{ cursor: null, isThinking: false }}`) → `ClientSideSuspense` (loading fallback) around an inner `CanvasFlow` that calls `useLiveblocksFlow<CanvasNode, CanvasEdge>({ suspense: true, nodes: { initial: [] }, edges: { initial: [] } })` and passes the synced `nodes`/`edges`/change handlers into `ReactFlow` with `connectionMode={ConnectionMode.Loose}`, `fitView`, a dot-pattern `Background`, and `MiniMap`. Wrapped the whole tree in a small class-based `CanvasErrorBoundary` (`getDerivedStateFromError`) to catch Liveblocks connection failures, since `ClientSideSuspense`'s `fallback` only covers the loading state, not thrown errors.
- Imported `@xyflow/react/dist/style.css` in `canvas.tsx` (not previously imported anywhere in the app).
- Replaced the canvas placeholder in `components/editor/workspace-shell.tsx` with `<Canvas roomId={activeProjectId} />` (project ID used directly as the Liveblocks room ID, matching Unit 10's auth route).
- No custom node/edge rendering, connection-mode controls, persistence, or AI behavior added — out of scope per spec.
- At the time of this unit, `npm run build` passed while `npm run lint` still had the known Unit 09 `share-dialog.tsx` error; the dialog lifecycle fix later restored lint health.
- Follow-up: the share-dialog close and failed-copy state resets now clear the pending copy timeout; `npm run lint` and `npm run build` pass, with the build generating the Prisma client first.
- Follow-up: `/api/liveblocks-auth` was returning a 500 (`context/current-issues.md`) because `LIVEBLOCKS_SECRET_KEY` in `.env.local` was still an empty placeholder, so every `getOrCreateRoom` attempt threw immediately through all 3 retries. The user supplied a real secret key; verified with an unauthenticated `POST /api/liveblocks-auth`, which now correctly redirects to sign-in (Clerk) instead of failing at room provisioning. `context/current-issues.md` cleared.
- Follow-up: `DELETE /api/projects/[projectId]` was returning a 500. Root cause: `lib/prisma.ts` caches the `PrismaClient` on `global.prismaGlobal` in development, and the long-running dev server's cached client instance predated the `ProjectMutation` model (added in Unit 09), so `prisma.projectMutation` was `undefined` on the stale instance. Since `getIdempotentResponse()` was called before `PATCH`/`DELETE`'s `try` block, the resulting `TypeError` was uncaught. Fixed by moving the `getIdempotentResponse()` calls inside the existing `try` blocks in `app/api/projects/[projectId]/route.ts` (so any future DB/client hiccup returns a proper `500` via `internalError()` instead of crashing the request) and restarting the dev server to pick up the current generated client. `context/current-issues.md` cleared.

### Feature Unit 12: Shape Panel

- Added `SHAPE_DEFAULT_SIZES` (per-shape default `width`/`height`, wider-than-tall rectangles/pills, square circles, an enlarged diamond) and `MIN_NODE_DIMENSION`/`MAX_NODE_DIMENSION` (40/600) to `types/canvas.ts`, shared between the drag payload and the drop handler's clamping.
- Added `components/editor/shape-panel.tsx`: a floating pill-shaped toolbar (`ShapePanel`) fixed bottom-center over the canvas, with one draggable icon button per `CanvasNodeShape` (lucide `Square`/`Diamond`/`Circle`/`Pill`/`Cylinder`/`Hexagon`). Drag payload is set on a dedicated MIME type (`SHAPE_DRAG_MIME_TYPE = "application/x-ghostai-shape"`, exported for the canvas drop handler) as `{ shape, size }` JSON, so the canvas only reads a payload it recognizes rather than parsing arbitrary `DataTransfer` content.
- Added `components/editor/canvas-node.tsx` (`CanvasNodeRenderer`): the `canvasNode` type's renderer for this unit — a bordered rectangle in the node's `color`/`textColor` with the centered label and four hover-revealed connection handles (top/right/bottom/left). Shape-specific visuals are out of scope per spec and deferred to a later unit.
- Updated `components/editor/canvas.tsx`: registered `nodeTypes={{ canvasNode: CanvasNodeRenderer }}` on `ReactFlow`; wrapped `CanvasFlow` in `ReactFlowProvider` (previously absent — needed so `useReactFlow().screenToFlowPosition` is available for the drop handler) and rendered `ShapePanel` alongside `ReactFlow` inside a shared relatively-positioned wrapper carrying the `dragover`/`drop` handlers.
- Drop handling: `handleDragOver` only calls `preventDefault` when the drag carries the app's own MIME type (so unrelated OS/browser drags are ignored); `handleDrop` reads that MIME type's payload, parses it defensively (`parseShapeDragPayload` — rejects non-JSON, non-object payloads, and any shape not in `NODE_SHAPES`), clamps `width`/`height` to finite values within `[MIN_NODE_DIMENSION, MAX_NODE_DIMENSION]` via `clampDimension`, converts the drop's screen position to canvas coordinates with `screenToFlowPosition`, and only then constructs the new node.
- New nodes: `id` from `crypto.randomUUID()`, `type: "canvasNode"`, empty `label`, `DEFAULT_NODE_COLOR` fill/text, the dragged shape stored in `data.shape`, and `width`/`height` from the (clamped) drag payload. Added collaboratively via `onNodesChange([{ type: "add", item: newNode }])` — the same Liveblocks-synced change handler used for all other node changes, so no separate mutation path was introduced.
- Verified `npm run build` and `npm run lint` pass.

## In Progress

- None.

## Next Up

- Add shape-specific visuals (diamond/hexagon/cylinder as inline SVGs per `context/ui-context.md`) to `CanvasNodeRenderer`, plus inline label editing and color selection for `canvasNode`.
- Add custom edge rendering for `canvasEdge` (smooth-step path, arrow marker, label).
- Add canvas controls and persistence (Vercel Blob snapshots per `context/architecture-context.md`).
- Implement the AI sidebar placeholder's real chat behavior.
- Continue with the next editor feature unit.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- `ProjectCollaborator.email` stores the canonicalized (trimmed, lowercased) address directly rather than a separate raw/canonical field pair, per the spec's "do not add extra fields" constraint.

## Session Notes

- Last completed implementation unit: context/feature-specs/12-shape-panel.md
- Unit status: completed; a bottom-center `ShapePanel` lets users drag one of six shapes onto the canvas, `canvas.tsx`'s `dragover`/`drop` handlers validate the payload and clamp node size before creating a node via `onNodesChange([{ type: "add", item }])`, and `CanvasNodeRenderer` renders new `canvasNode`s as a bordered rectangle. `npm run build` and `npm run lint` pass. `LIVEBLOCKS_SECRET_KEY` in `.env.local` has been supplied with a real secret key and verified working.
