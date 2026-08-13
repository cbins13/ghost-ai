# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Completed: Feature Unit 09

## Current Goal

- Prepare for the next feature: real canvas logic (Liveblocks + React Flow) inside the workspace shell.

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
- Verified `npm run build` and `npm run lint` pass.

## In Progress

- None.

## Next Up

- Wire the canvas placeholder in `components/editor/workspace-shell.tsx` to real Liveblocks + React Flow state.
- Implement the AI sidebar placeholder's real chat behavior.
- Continue with the next editor feature unit.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- `ProjectCollaborator.email` stores the canonicalized (trimmed, lowercased) address directly rather than a separate raw/canonical field pair, per the spec's "do not add extra fields" constraint.

## Session Notes

- Last completed implementation unit: context/feature-specs/09-share-dialog.md
- Unit status: completed; owners can invite/remove collaborators and copy the project link from the share dialog, collaborators get read-only access, and names/avatars are enriched live from Clerk. `npm run build` and `npm run lint` pass.
