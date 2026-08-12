# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Completed: Feature Unit 05

## Current Goal

- Prepare for the next feature after completing the Prisma schema and data layer.

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

## In Progress

- None.

## Next Up

- Continue with the next editor feature unit.
- When collaborator-facing API routes and `lib/project-access.ts` are built, canonicalize collaborator emails with `trim().toLowerCase()` before every write and lookup against `ProjectCollaborator.email` — neither exists yet, so this wasn't implemented in Unit 05.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- `ProjectCollaborator.email` stores the canonicalized (trimmed, lowercased) address directly rather than a separate raw/canonical field pair, per the spec's "do not add extra fields" constraint.

## Session Notes

- Last completed implementation unit: context/feature-specs/05-prisma..md
- Unit status: completed; migration applied, client generated, `npm run build` passes.
- Post-completion follow-up: project row selection now routes using the immutable project ID.
