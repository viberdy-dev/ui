# Draggable Sortable List: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Draggable Sortable List** from scratch, or edit it first to restyle it. The finished code is [components/draggable-sortable-list.tsx](../components/draggable-sortable-list.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/draggable-sortable-list?ref=github).

````text
Create a React + Tailwind + Framer Motion "draggable sortable list" component named SortableList.

Behavior:
- A vertical list of rows that can be reordered by dragging. Use Framer Motion's dedicated `Reorder.Group` (with axis="y", a `values` array in state, and `onReorder={setItems}`) wrapping `Reorder.Item` elements — these primitives handle the drag gesture, the layout-animated swap of other items as you drag one over them, and committing the new order, internally. Do NOT hand-roll this with manual onDragEnd index math; Reorder.Group is purpose-built for exactly this.
- Each row should only be draggable via a dedicated grip-handle icon/button, not by clicking anywhere on the row (which would make row text unselectable and interfere with any buttons/links inside the row). Achieve this with `dragListener={false}` on the Reorder.Item plus a `useDragControls()` hook, then call `controls.start(event)` in the handle's onPointerDown — this is the documented pattern for a "drag handle only" reorderable list.
- Extract each row into its own small subcomponent so each row calls its own `useDragControls()` instance — calling that hook inside a .map() callback directly in the parent would violate the rules of hooks.
- Props: items (array of row labels).

Style: card-style rows with a grip-dots icon on the left, subtle shadow, rounded corners.

Output a single self-contained "use client" module (main component + row subcomponent).
````
