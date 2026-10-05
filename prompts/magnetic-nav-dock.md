# Magnetic Nav Dock: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Magnetic Nav Dock** from scratch, or edit it first to restyle it. The finished code is [components/magnetic-nav-dock.tsx](../components/magnetic-nav-dock.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/magnetic-nav-dock?ref=github).

````text
Create a React + Tailwind + Framer Motion "magnetic dock" component named MagneticNavDock, replicating the macOS dock magnification effect.

Behavior:
- A row of icon tiles. Track the mouse's X position at the container level with a single shared `useMotionValue(Infinity)` (Infinity as the "mouse not present" sentinel, which naturally makes every distance calculation huge and every icon settle at its base size when the pointer leaves).
- Each icon is its own subcomponent that receives the shared mouseX MotionValue as a prop. Inside, use useTransform(mouseX, x => distanceFromThisIconsCenter) to compute a live horizontal pixel distance from its own DOM center (read via a ref + getBoundingClientRect on each transform call), then a second useTransform mapping that distance through [-120, 0, 120] px to [baseSize, maxSize, baseSize] so the closer the cursor, the bigger the icon — smoothly falling off with distance, not a binary hover toggle.
- Wrap the size output in useSpring (useSpring can take another MotionValue as its source) so size changes ease physically instead of snapping instantly as the cursor moves.
- Only the icon closest to the cursor should read as "picked up" — neighbors partially inflate too since it's driven by continuous distance, not per-icon hover.
- Props: icons (array of emoji or short labels), baseSize, maxSize (px).

Style: dark glassy dock bar, rounded tiles, soft shadow — a floating dock feel.

Output a single self-contained "use client" module (main component + the per-icon subcomponent, since each needs its own hook call site).
````
