# Snapping Cursor: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Snapping Cursor** from scratch, or edit it first to restyle it. The finished code is [components/cursor-snap-target.tsx](../components/cursor-snap-target.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/cursor-snap-target?ref=github).

````text
Create a React + Tailwind + Framer Motion component named CursorSnapTarget — a custom cursor that snaps onto interactive elements and takes their shape.

Behavior:
- Wraps children in a relative container with cursor-none.
- In open space the cursor is a small circle (idleSize px) that follows the pointer with a spring.
- When the pointer enters any descendant carrying a data-cursor-snap attribute, the cursor animates to that element's bounding box (plus a padding on each side) and morphs from a circle to a rounded rectangle. Read the box with getBoundingClientRect and subtract the wrapper's own rect so the coordinates are wrapper-relative.
- While snapped, free pointer tracking is SUSPENDED — the cursor stays pinned to the target box until the pointer leaves it. This is what makes it feel magnetic rather than jittery.
- Use one delegated onMouseOver handler with event.target.closest("[data-cursor-snap]"), not per-element handlers.

Implementation requirements:
- x, y, width and height must be Framer useMotionValue wrapped in useSpring (stiffness 480, damping 36, mass 0.6) — not React state. Only the boolean "is snapped" is state.
- Animate borderRadius between 999 and 8 to morph circle to rectangle.

Props: children (ReactNode), idleSize (number), padding (number).

Style: 1px accent border, translucent accent fill, sits above content but pointer-events-none.

Output a single self-contained "use client" component.
````
