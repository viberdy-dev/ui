# Pointer Warp Dot Field: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Pointer Warp Dot Field** from scratch, or edit it first to restyle it. The finished code is [components/pointer-warp-dot-field.tsx](../components/pointer-warp-dot-field.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/pointer-warp-dot-field?ref=github).

````text
Create a React + Tailwind component named PointerWarpDotField — a canvas dot grid that bulges away from the cursor.

Behavior:
- Fill the container with a regular grid of small dots at `spacing` px.
- Dots within `radius` px of the pointer are pushed radially outward and scaled up; the rest sit at rest.
- Displacement uses a SQUARED falloff — f = (1 - dist / radius) ** 2 — so the bulge has a soft shoulder instead of a visible circular edge. Offset each dot by (dx / dist) * f * strength.
- Affected dots take the accent color; resting dots are faint neutral.

Implementation requirements (these are the point of the component):
- Use ONE <canvas>, not DOM nodes. A grid this size is hundreds of nodes, and transforming hundreds of absolutely-positioned elements per frame is layout/paint work the compositor cannot absorb. Canvas draws them all in one pass.
- Pointer position must live in a ref, NOT React state — the rAF loop reads it each frame, so pointer movement never triggers a React render.
- Store props in a ref too, so changing one does not tear down and restart the loop.
- Handle devicePixelRatio: scale the backing store by DPR (capped at 2) and call ctx.setTransform(dpr, 0, 0, dpr, 0, 0). Re-run on resize via ResizeObserver.
- Cancel the animation frame and disconnect the observer on unmount.

Props: spacing (number), radius (number), strength (number).

Output a single self-contained "use client" component.
````
