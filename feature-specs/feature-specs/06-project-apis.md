The database schema is ready. Build the backend project API routes only.

## Routes

Create REST endpoints for:

- `GET /api/projects` , list current user’s projects
- `POST /api/projects` , create project
- `PATCH /api/projects/[projectId]` , rename project
- `DELETE /api/projects/[projectId]` , delete project

## Contract

Project JSON: `{ "id": string, "name": string, "ownerId": string, "createdAt": string, "updatedAt": string }`.

- `GET /api/projects` returns `200` with `{ "owned": Project[], "shared": Project[] }`.
- `POST /api/projects` accepts `{ "name"?: string }` and returns `201` with `{ "project": Project }`.
- `PATCH /api/projects/[projectId]` accepts `{ "name": string }` and returns `200` with `{ "project": Project }`.
- `DELETE /api/projects/[projectId]` returns `204` with no body.

All JSON errors use `{ "error": { "code": string, "message": string } }`: `401` for unauthenticated requests, `400` for validation failures, `403` for forbidden owner-only mutations, `404` for missing projects, `409` for constraint conflicts, and `500` for database failures.

## Rules

Use the authenticated Clerk user ID as `ownerId`.

When creating:

- trim the supplied name
- default missing, empty, or whitespace-only create names to `Untitled Project`
- reject names longer than 120 characters with the documented `400` validation error
- use the schema’s existing ID strategy, do not add sequential IDs

When renaming:

- trim the supplied name
- reject missing, empty, or whitespace-only names with the documented `400` validation error; do not apply the creation default
- reject names longer than 120 characters with the documented `400` validation error

Security:

- unauthenticated requests return `401`
- only the project owner can rename or delete
- non-owner mutations return `403`

Keep this backend-only. Do not wire the UI yet.

## Check When Done

- routes exist for list/create/rename/delete
- owner checks are enforced for rename/delete
- `401` and `403` responses are handled correctly
- `npm run build` passes
