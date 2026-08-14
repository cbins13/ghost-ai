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

### Feature Unit 13: Node Shape Rendering And Drag Preview

- Added `components/editor/shape-visual.tsx` (`ShapeVisual`): the single source of truth for shape rendering, shared between `CanvasNodeRenderer` and the shape panel's drag preview. `rectangle`/`pill`/`circle` render as absolutely-positioned CSS divs (`rounded-xl`/`rounded-full`); `diamond`/`hexagon`/`cylinder` render as an absolutely-positioned SVG with `preserveAspectRatio="none"` so the shape stretches to fill the node's actual `width`/`height` instead of staying square. Exposes `SHAPE_GEOMETRY` (polygon points for diamond/hexagon, ellipse/path geometry for cylinder) as a shared constant.
- Updated `components/editor/canvas-node.tsx`: `CanvasNodeRenderer` now renders `ShapeVisual` as the node body instead of a plain bordered rectangle, with the label and connection handles absolutely layered on top. Border color/width now reacts to `NodeProps.selected`: subtle (`--border-subtle`, 1.5px) at rest, brighter (`--accent-primary`, 2px) when selected.
- Updated `components/editor/shape-panel.tsx`: dragging a shape button now shows a custom ghost preview that follows the cursor, built from the same `ShapeVisual` at the shape's `SHAPE_DEFAULT_SIZES` dimensions. The native browser drag ghost is suppressed via `dataTransfer.setDragImage` pointed at a persistent 1x1 transparent div (required to be attached to the DOM for cross-browser `setDragImage` support); cursor position is tracked via the button's `onDrag` handler (ignoring the spurious final `(0,0)` event some browsers fire) and cleared in `onDragEnd`, which fires on both successful drop and cancelled drag, so no separate cleanup path was needed.
- No changes to shape panel layout, node creation logic, or drag/drop payload handling — scoped to rendering only, per spec.
- Verified `npm run build` passes (TypeScript, static generation, and all routes compile cleanly).

### Feature Unit 14: Node Resizing And Inline Label Editing

- Updated `components/editor/canvas-node.tsx` (`CanvasNodeRenderer`): added `@xyflow/react`'s `NodeResizer` (`isVisible={selected}`, `minWidth`/`minHeight` from `MIN_NODE_DIMENSION`) — resize drags flow through the same controlled `onNodesChange` path as node dragging (`triggerNodeChanges` internally), so resized dimensions sync through Liveblocks with no extra wiring.
- Added inline label editing: double-clicking the node body enters edit mode, swapping the centered label `span` for a centered `textarea` (wrapped in a flex-centered container) pre-filled with the current label. Typing updates local `draftLabel` state only; committing (`blur` or `Escape`) calls a new `updateNodeLabel(nodeId, label)` action and exits edit mode. Empty labels show muted centered placeholder text ("Double-click to edit") in the same position instead of an empty span, so there's no layout shift between states.
- The textarea has `nodrag nopan` classes (React Flow's built-in escape-hatch classes) so typing, selecting, and clicking inside it never starts a node drag or canvas pan.
- Added `updateNodeLabel` to `components/editor/canvas.tsx`'s `CanvasActionsContext` (alongside the existing `createNodeAtCenter`): looks up the current node by ID in the Liveblocks-synced `nodes` array and dispatches a single `onNodesChange([{ type: "replace", id, item: { ...node, data: { ...node.data, label } } }])` — the same collaborative change path used for node creation, since directly mutating node data via `useReactFlow().updateNodeData` would only touch React Flow's internal store and be overwritten by the next Liveblocks-controlled `nodes` prop update.
- No changes to shape rendering, the shape panel, drag preview, or node creation — scoped to resize and label editing only, per spec.
- Verified `npm run build` and `npm run lint` pass (one pre-existing, unrelated `viewport` unused-var warning in `canvas.tsx` predates this unit).

### Feature Unit 15: Nodes Color Toolbar

- Added `components/editor/node-color-toolbar.tsx` (`NodeColorToolbar`): a floating pill toolbar rendering one circular swatch per `NODE_COLORS` pair (reused from `types/canvas.ts`, no new palette added). Positioned via `absolute bottom-full` + `-translate-x-1/2` so it sits centered above the node without overlapping it. The active swatch gets a persistent ring in its paired text color; hovering any swatch adds a tight `box-shadow` glow in that swatch's text color (inline styles, since the glow color is per-swatch data, not a static Tailwind class). Carries `nodrag nopan` classes and stops `onMouseDown` propagation so clicking a swatch never starts a node drag or canvas pan.
- Updated `components/editor/canvas-node.tsx` (`CanvasNodeRenderer`): renders `NodeColorToolbar` only when `selected`, wired to a new `updateNodeColor` action.
- Updated `components/editor/canvas.tsx`: added `updateNodeColor(nodeId, color)` to `CanvasActionsContext`, mirroring `updateNodeLabel` — looks up the node in the Liveblocks-synced `nodes` array and dispatches a single `onNodesChange([{ type: "replace", ... }])` setting both `data.color` and `data.textColor` from the selected pair, so the node body and label update immediately through the existing collaborative state with no server calls.
- No changes to drag/drop, node selection logic, or a full color picker — swatches are limited to the 8 predefined pairs, per spec scope.
- Verified `npm run build` passes.

### Feature Unit 16: Edge Behavior

- Updated `components/editor/canvas-node.tsx`'s connection handles to match the spec's "small white dots with a dark border": `!bg-[var(--text-primary)]` fill with a `!border-2 !border-[var(--bg-base)]` dark border, still hidden at rest and faded in on node hover. Connections from any handle to any other already worked via the existing `ConnectionMode.Loose` + `type="source"` handles, so no handle-type changes were needed.
- Added `components/editor/canvas-edge.tsx` (`CanvasEdgeRenderer`, the `canvasEdge` type's renderer) with a co-located `EDGE_COLOR` constant (`#f8fafc`, the literal hex from `context/ui-context.md`'s edge style section — canvas content color, not a UI chrome token, matching how `NODE_COLORS` are defined). Uses `getSmoothStepPath({ borderRadius: 0, ... })` for right-angle routing and renders via `BaseEdge` (rounded stroke caps, dimmed `opacity: 0.55` at rest, full opacity on hover/selected/editing). A separate transparent `stroke-width: 20` path sits on top for a larger hover/click hit area without thickening the visible line.
- Added inline label editing: double-clicking the edge (either the wide hit-area path or the label itself) enters edit mode via `EdgeLabelRenderer` positioned at the `getSmoothStepPath` label midpoint (`labelX`/`labelY`) — no manual midpoint math. The input's `width` is set in `ch` units from the draft text length so it grows with input; commits on blur or Enter, reverts to the saved label on Escape. Saved labels render as a small pill badge; an active edge (hovered/selected/editing) with no label shows a faint dashed "Add label" hint instead. The label wrapper carries `nodrag nopan` and stops `onMouseDown` propagation so clicks and typing never pan the canvas or start a drag.
- Updated `components/editor/canvas.tsx`: registered `edgeTypes={{ canvasEdge: CanvasEdgeRenderer }}` and `defaultEdgeOptions={{ type: "canvasEdge", markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR } }}` on `ReactFlow`, so new connections use the custom edge with an arrowhead by default. Added `updateEdgeLabel(edgeId, label?)` to `CanvasActionsContext`, mirroring `updateNodeLabel`/`updateNodeColor` — looks up the edge in the Liveblocks-synced `edges` array and dispatches `onEdgesChange([{ type: "replace", id: edgeId, item: { ...edge, data: { ...edge.data, label } } }])`, the same collaborative change path used elsewhere, with the `{ edgeId, label? }` shape specified by the spec.
- No changes to node creation, the shape panel, or the node renderer beyond the handle color/border tweak — scoped to edge rendering, labels, and connection behavior, per spec.
- Verified `npm run build` passes (TypeScript, static generation, and all routes compile cleanly).

### Feature Unit 17: Canvas Ergonomics (Zoom/Undo-Redo Control Bar + Keyboard Shortcuts)

- Added `components/editor/canvas-control-bar.tsx` (`CanvasControlBar`): a pill-shaped bar fixed bottom-left (`bottom-24 left-6`, above the shape panel) with a zoom group (zoom out, fit view, zoom in) and a history group (undo, redo) separated by a thin divider. Zoom buttons call the React Flow instance's `zoomOut`/`fitView`/`zoomIn` with a 200ms `duration` for a smooth animation. Undo/redo buttons are `disabled` (visually dimmed via `disabled:opacity-40`) when `canUndo`/`canRedo` are false.
- Added `hooks/use-keyboard-shortcuts.ts` (`useKeyboardShortcuts`): takes the React Flow instance plus `onUndo`/`onRedo` handlers, attaches a single `keydown` listener to `window`, and bails out immediately for any event targeting an `<input>`, `<textarea>`, or `contentEditable` element. Implements the spec's exact modifier matrix — zoom in on bare `=` or `Shift+plus`, zoom out on bare `-`, undo on exactly one of `Ctrl`/`Meta` + `z` (no `Shift`/`Alt`), redo on exactly one of `Ctrl`/`Meta` + `Shift+z` or bare `Ctrl`/`Meta`+`y` — and calls `preventDefault()` only for matched shortcuts, after the editable-field check.
- Updated `components/editor/canvas.tsx`: wired Liveblocks' `useUndo`/`useRedo`/`useCanUndo`/`useCanRedo` hooks (existing library hooks, no new collaborative state), passed the `useReactFlow()` instance into both `useKeyboardShortcuts` and the new `CanvasControlBar` rendered alongside `ShapePanel`.
- No changes to the shape panel, node/edge rendering, or the Liveblocks room/sync setup beyond consuming its existing history hooks, per spec scope.
- Verified `npm run build` passes (TypeScript, static generation, and all routes compile cleanly).

### Feature Unit 18: Starter Templates

- Added `components/editor/starter-templates.ts`: `CanvasTemplate`/`TemplateNode`/`TemplateEdge` types (template-local string ids, not real node/edge ids) and `CANVAS_TEMPLATES` with three templates (microservices, CI/CD pipeline, event-driven system) built via small `node()`/`edge()` helpers, reusing `NODE_COLORS` (by index, via `resolveTemplateColor`) and `SHAPE_DEFAULT_SIZES` from `types/canvas.ts`.
- Added `components/editor/starter-templates-modal.tsx`: a `Dialog` showing a scrollable grid of template cards (name, description, lightweight SVG/CSS preview built directly from template node positions — no React Flow instance). `TemplatePreview` computes bounds from node positions/sizes, scales/centers them into a fixed 240×140 viewport, draws edges as `<line>`s between node centers, and renders each node with the existing `ShapeVisual` component (shared with the real canvas renderer, not reimplemented). Each card's Import button calls `onImport(template)` then closes the modal.
- Added `components/editor/starter-templates-import-dialog.tsx` (`StarterTemplatesImportDialog`): the confirm/conflict dialog shown when importing into a non-empty canvas — "Replace canvas?" with Cancel/Replace, or (on conflict) "Canvas changed" with Cancel/"Refresh & Retry".
- Updated `components/editor/canvas.tsx` (`CanvasFlow`): added `requestImport(template)` — applies immediately with no confirmation only when the canvas is already empty; otherwise captures a `snapshotSignature(nodes, edges)` (sorted `id:position:data` / `id:source-target:data` string, since neither `useLiveblocksFlow` nor the room expose a numeric storage revision) and opens the confirm dialog. `confirmImport()` re-computes the signature against the live `nodes`/`edges` at confirm time; a mismatch (a collaborator edited the canvas while the dialog was open) sets a conflict state instead of applying, surfaced via the same dialog with a "Refresh & Retry" action that re-captures the snapshot rather than silently overwriting. `applyTemplate()` builds fresh nodes/edges (new `crypto.randomUUID()` ids, template-local ids remapped for edge source/target) and replaces the canvas via `room.batch()` (from `useRoom()`) wrapping one `onNodesChange` call (remove-all + add-all) and one `onEdgesChange` call — the same public change-array API used elsewhere, batched into a single Liveblocks history entry so one local undo fully restores the pre-import nodes/edges without touching unrelated collaborator edits made after the replacement. Calls `fitView()` after applying.
- `Canvas` now takes `isTemplatesModalOpen`/`onTemplatesModalOpenChange`, lifted to `components/editor/workspace-shell.tsx` (mirrors the existing `isShareDialogOpen` pattern) and opened from a new "Templates" button in `components/editor/workspace-navbar.tsx` (`onTemplatesClick`, `LayoutTemplate` icon).
- No template saving, custom user templates, or server persistence added — importing only replaces in-memory/Liveblocks-synced canvas state, per spec scope.
- Verified `npm run build` and `npm run lint` pass (only the pre-existing Unit 14 `viewport` unused-var warning in `canvas.tsx` remains).

## In Progress

- None.

## Next Up

- Add canvas persistence (Vercel Blob snapshots per `context/architecture-context.md`).
- Implement the AI sidebar placeholder's real chat behavior.
- Continue with the next editor feature unit.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- `ProjectCollaborator.email` stores the canonicalized (trimmed, lowercased) address directly rather than a separate raw/canonical field pair, per the spec's "do not add extra fields" constraint.

## Session Notes

- Last completed implementation unit: context/feature-specs/18-starter-templates.md
- Unit status: completed; navbar "Templates" button opens a modal of three predefined templates with lightweight previews, importing replaces the canvas atomically via `room.batch()` around a single `onNodesChange`/`onEdgesChange` call pair (one undo entry). Non-empty canvases require confirmation; a signature comparison at confirm time detects collaborator edits made while the dialog was open and surfaces a conflict state requiring explicit "Refresh & Retry" instead of silently overwriting. `npm run build` and `npm run lint` pass.
- Design note: Liveblocks' `useLiveblocksFlow`/room APIs don't expose a numeric storage revision counter, so conflict detection uses a deep signature of the current nodes/edges (sorted id+position/source-target+data) captured when the confirm dialog opens, compared again at confirm time — functionally equivalent optimistic-concurrency check without a literal revision number.
- `LIVEBLOCKS_SECRET_KEY` in `.env.local` has been supplied with a real secret key and verified working.
