# Extruded Type Tilt: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Extruded Type Tilt** from scratch, or edit it first to restyle it. The finished code is [components/extruded-type-tilt.tsx](../components/extruded-type-tilt.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/extruded-type-tilt?ref=github).

````text
Create a React + Tailwind component named ExtrudedTypeTilt — oversized display text with a solid extrusion that re-orients toward the pointer.

Behavior:
- Render the word N+1 times inside a relatively-positioned span: N absolutely-positioned extrusion layers plus one front face in normal flow (the front face is what sizes the box).
- Each extrusion layer i is translated by (dir.x * depth * step, dir.y * depth * step) where step counts DOWN from N, so the furthest layer paints first and nearer layers cover it.
- Darken/fade layers with distance so the side wall reads as a solid receding into shadow rather than a flat stack.
- On mouse move, map pointer position to a -1..1 vector and INVERT it, so the extrusion trails away from the cursor like a shadow cast by it. Default to (0.7, 0.7) — down-right, the conventional light position — so it reads correctly before any input and on mouse leave.

Why it is built this way (keep this):
- Only the offset DIRECTION changes, so the solid appears to rotate with no real 3D. Avoiding perspective / transform-style: preserve-3d means the glyphs are never GPU-rasterised at a fractional scale, so the type stays razor sharp. A genuine 3D rotation blurs text.

Accessibility:
- The word is rendered many times. Mark the whole visual stack aria-hidden and render exactly ONE sr-only copy of the string.

Props: text (string), layers (number), depth (number, px per layer).

Output a single self-contained "use client" component.
````
