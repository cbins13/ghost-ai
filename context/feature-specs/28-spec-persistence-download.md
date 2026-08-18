Persist generated specs with Vercel Blob and Prisma, then add a secure download route so users can retrieve their generated spec files.

### Implementation

1. ProjectSpec model

Ensure a `ProjectSpec` Prisma model exists with:

- `id`
- `projectId` (relation to Project)
- `filePath` (a Vercel Blob pathname or key only, never an arbitrary URL or filesystem path)
- `filename`
- deterministic `idempotencyKey` with a unique Prisma constraint
- `createdAt`

Use this model for metadata only. The actual spec content should live in Vercel Blob.

2. Save generated spec

After a spec is generated:

- upload the Markdown content to Vercel Blob
- store the trusted Blob pathname/key in `ProjectSpec.filePath` and a stable filename in `ProjectSpec.filename`
- link the record to the correct project
- reuse the existing record/blob for the same idempotency key on retries; reconcile or clean up a Blob upload if its metadata write fails
- follow the same metadata + blob pattern used for canvas persistence

3. Download route

Create a route like: `GET /api/projects/[projectId]/specs/[specId]/download`

It should:

- authenticate the user
- verify access to the project
- verify the spec belongs to that project
	- retrieve the file through the Vercel Blob SDK using `ProjectSpec.filePath`, never by unrestricted server-side fetch
- return it as a downloadable Markdown file
	- use `text/markdown; charset=utf-8` and `Content-Disposition: attachment` with the stored filename, or a deterministic sanitized fallback filename
- handle not found and forbidden cases properly

### Scope Limits

- do not add frontend or UI logic
- do not store spec content in Prisma
- do not expose Blob URLs without access checks
- do not modify existing canvas persistence

### Notes

- check `context/project-overview.md` and `context/architecture-context.md` first
- reuse existing project access patterns
- Prisma stores metadata, Vercel Blob stores content

### Check When Done

- `ProjectSpec` model exists with required fields
- spec is uploaded to Vercel Blob
- `filePath` is saved correctly
- download route validates access before returning file
- response is a Markdown attachment
- TypeScript and build pass
