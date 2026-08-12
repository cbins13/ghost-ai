Add a small starter template library so users can start a canvas from a pre-built diagram instead of building from scratch.

## Implementation

1. Create `components/editor/starter-templates.ts`.

   Include:
   - a `CanvasTemplate` type
   - a `CANVAS_TEMPLATES` array
   - at least three templates, such as microservices, CI/CD pipeline, and event-driven system

   Each template should include:
   - `id`
   - `name`
   - `description`
   - nodes
   - edges

   Use the shared canvas types and existing node color palette. Add small helper functions if needed to keep the template data readable.

2. Create `components/editor/starter-templates-modal.tsx`.

   The modal should:
   - open as a dialog
   - show template cards in a scrollable grid
   - show the template name and description
   - include an import button for each template
   - call `onImport` with the selected template, then close

3. Add a simple diagram preview to each template card.
   - fit the preview to a fixed-size viewport
   - calculate the preview bounds from the template node positions
   - draw edges as simple lines between node centers
   - draw nodes using their shape and color data
   - keep the preview lightweight, no React Flow instance needed

4. Wire starter templates into the editor.
   - add a navbar button to open the starter templates modal
   - when a template is selected, clear and replace all existing nodes and edges within one Liveblocks `useMutation` callback, producing a single undoable history entry
   - prevent intermediate or interleaved collaborative updates while the replacement mutation runs
   - make sure the starter template replaces the current canvas instead of being added on top of existing work
   - require confirmation before replacing a non-empty canvas unless the single undo entry fully restores the previous nodes and edges
   - capture the authoritative room revision and node/edge snapshot before confirmation; conditionally apply the replacement only if that revision is unchanged
   - on a revision conflict, do not overwrite collaborator changes: refresh the authoritative canvas, show a conflict state, and require the user to review and explicitly retry the import
   - a local undo must restore the complete pre-import node and edge collections without removing unrelated collaborator edits that occurred after the replacement
   - fit the view after the template is loaded
   - keep this inside the existing collaborative canvas state

## Scope Limits

- don’t add template saving yet
- don’t add custom user templates
- don’t add server persistence
- don’t change node or edge rendering behavior
- keep this focused on importing predefined templates

## Check When Done

- Template data is defined using shared canvas types.
- Import modal renders template cards with previews.
- Import action replaces the current canvas through the existing node and edge state flow.
- Concurrent collaborator edits are detected and never silently overwritten; conflict retry is explicit.
- A single local undo restores the complete pre-import collections while preserving unrelated collaborator edits.
- Editor navbar includes the import entry point.
- `npm run build` passes.
