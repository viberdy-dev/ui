# Kanban Drag Columns: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Kanban Drag Columns** from scratch, or edit it first to restyle it. The finished code is [components/kanban-drag-columns.tsx](../components/kanban-drag-columns.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/kanban-drag-columns?ref=github).

````text
Create a React + Tailwind + Framer Motion "kanban board with cross-column drag" component named KanbanDragColumns.

Behavior:
- State is a Columns object: { [columnName]: Card[] }. Each column renders its cards inside a Framer Motion Reorder.Group (axis="y") for in-column reordering, same primitive as a sortable list.
- Cross-column movement: each column's root element carries a `data-column` attribute. On each Reorder.Item's onDragEnd, read the drag end point (info.point.x/y), use document.elementFromPoint to find what's under the cursor, walk up with closest('[data-column]') to find which column it landed in, and if that's a DIFFERENT column than the card's current one, move the card object from the old column's array to the new column's array in state.
- This is a real two-part interaction: Reorder.Group handles in-column position, the manual elementFromPoint check handles moving between columns — Reorder.Group alone only reorders within its own `values` array and has no built-in concept of a different list.
- Give dragged cards a whileDrag lift (scale + shadow) for drag feedback.
- Props: initialColumns (the starting board state).

Style: narrow columns with a header + count, cards as small rounded chips, columns visually separated.

Output a single self-contained "use client" component.
````
