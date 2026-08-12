# Prisma Schema And Data Layer

## Goal

Prisma is already installed. Add the project data models, Prisma client singleton, and first migration.

## Models

Create `prisma/models/project.prisma`.

Add `Project`:

- `id String @id @default(cuid())`
- `ownerId String`, containing the external Clerk user ID; do not add a local user model or Prisma relation
- `name String`
- `description String?`
- `status ProjectStatus @default(DRAFT)`, where `ProjectStatus` contains `DRAFT` and `ARCHIVED`
- `canvasJsonPath String?` for future canvas blob storage
- `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`
- indexes on `ownerId` and `createdAt`

Ownership validation is enforced in application code using the external Clerk user ID.

Add `ProjectCollaborator`:

- project relation with cascade delete
- collaborator email, canonicalized with `trim().toLowerCase()` before storage and lookup
- creation timestamp
- unique constraint on project/canonical email
- indexes on email and project/date

Do not add extra fields unless required by Prisma.

Apply the same email canonicalization in `project-access.ts` and every collaborator API lookup so case or surrounding whitespace cannot create distinct collaborator records.

## Prisma Client

Create `lib/prisma.ts` as a cached singleton.

Branch by `DATABASE_URL`:

- if it starts with `prisma+postgres://`, use Accelerate
- otherwise use direct `@prisma/adapter-pg`

Cache the client on `global` in development for hot reloads.

## Migration

Run the migration and generate the client.

## Dependencies

Already installed:

- `prisma`
- `@prisma/client`
- `@prisma/adapter-pg`
- `pg`

## Check When Done

- schema has both models with correct relations and indexes
- `lib/prisma.ts` exports one cached Prisma instance
- migration runs successfully
- `npm run build` passes
