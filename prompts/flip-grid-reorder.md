# FLIP Grid Reorder: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **FLIP Grid Reorder** from scratch, or edit it first to restyle it. The finished code is [components/flip-grid-reorder.tsx](../components/flip-grid-reorder.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/flip-grid-reorder?ref=github).

````text
Create a React + Tailwind + Framer Motion component named FlipGridReorder — a filterable grid whose tiles glide to their new positions.

Behavior:
- A row of filter chips above a CSS grid of tiles. Selecting a filter removes non-matching tiles; the remaining ones animate to their new grid positions rather than snapping.
- Entering tiles fade and scale up from 0.8; leaving tiles fade and scale down.
- Layout transition is a spring (stiffness configurable, damping 30). Opacity/scale use a short 180ms duration.

Implementation requirements:
- Put `layout` on each tile's motion.div. That is the entire reorder animation — Framer records each element's box before the DOM change and again after, then animates the difference with a transform (FLIP). Do not measure anything manually.
- Wrap the list in <AnimatePresence mode="popLayout"> so removed tiles animate out while the survivors are already moving to their new spots. Without popLayout, exiting tiles hold their grid slot and the reflow happens only after they finish.
- CRITICAL: the React key must be each item's STABLE id, never the array index. With an index key React reuses the same DOM node for a different item after filtering, so Framer measures before/after boxes belonging to two unrelated items and tiles appear to teleport and morph instead of travelling. This single line decides whether the effect works.

Props: items (array of {id, label, group}), filters (array of {id, label}), columns (number), stiffness (number).

Output a single self-contained "use client" component.
````
