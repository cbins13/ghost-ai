# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Completed: Feature Unit 07

## Current Goal

- Prepare for the next feature after wiring the editor home to the real project API.

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

## In Progress

- None.

## Next Up

- Build the `/editor/[projectId]` workspace route/canvas; `useProjectActions`'s `activeProjectId` option is ready for it to enable delete-redirect-when-active behavior.
- Continue with the next editor feature unit.
- When collaborator-facing API routes and `lib/project-access.ts` are built, canonicalize collaborator emails with `trim().toLowerCase()` before every write and lookup against `ProjectCollaborator.email` — Unit 06's `GET /api/projects` reads via this field but no write path exists yet.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- `ProjectCollaborator.email` stores the canonicalized (trimmed, lowercased) address directly rather than a separate raw/canonical field pair, per the spec's "do not add extra fields" constraint.

## Session Notes

- Last completed implementation unit: context/feature-specs/07-wire-editor-home.md
- Unit status: completed; editor home fetches real data server-side, create/rename/delete call the real API, `npm run build` and `npm run lint` pass.
