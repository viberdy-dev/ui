# Liquid Blob Cursor Follow: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Liquid Blob Cursor Follow** from scratch, or edit it first to restyle it. The finished code is [components/liquid-blob-cursor.tsx](../components/liquid-blob-cursor.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/liquid-blob-cursor?ref=github).

````text
Create a React + Tailwind + Framer Motion "liquid blob cursor follow" component named LiquidBlobCursor.

Behavior:
- A soft, heavily-blurred colored circle that follows the mouse cursor within a bounded container, trailing slightly behind with spring physics rather than snapping instantly to the pointer.
- Track raw cursor position via two Framer Motion useMotionValue instances (x, y), updated directly with .set() inside an onMouseMove handler on the container — do NOT use React useState for the raw position, that would re-render on every mousemove event and is unnecessary since motion values update outside React's render cycle.
- Wrap each raw motion value in useSpring (stiffness ~120, damping ~16, mass ~0.6) to get a smoothed, lagging version, and feed THAT into the blob's style.x / style.y — this produces the "liquid" trailing-follow feel instead of a rigid 1:1 cursor lock.
- The blob itself: an absolutely-positioned div with a large blur() filter, translated by -50%/-50% so it's centered on the tracked point, sized and colored via props.
- Compute cursor position relative to the container (via the container's own ref and getBoundingClientRect), not viewport-absolute coordinates, so the effect works correctly no matter where the container sits on the page.
- Props: size (blob diameter), softness (blur radius in px).

Style: single accent-colored blurred circle, semi-transparent, contained within a bounded box with overflow-hidden.

Output a single self-contained "use client" component.
````
