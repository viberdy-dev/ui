# Spotlight Card Grid: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Spotlight Card Grid** from scratch, or edit it first to restyle it. The finished code is [components/spotlight-grid.tsx](../components/spotlight-grid.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/spotlight-grid?ref=github).

````text
Create a React + Tailwind "spotlight card grid" pattern named SpotlightGrid.

Behavior:
- A grid container tracks the mouse position relative to itself (getBoundingClientRect + onMouseMove) and stores it in state.
- An absolutely-positioned overlay div sits on top of the grid with a radial-gradient background centered at the live cursor coordinates: `radial-gradient(RADIUSpx circle at Xpx Ypx, rgba(255,45,45,0.16), transparent 70%)`.
- The overlay fades in on mouse enter and out on mouse leave via opacity transition, and is pointer-events-none so it never blocks clicks on the cards beneath.
- Cards inside the grid sit at a higher z-index than the overlay so the spotlight appears to wash over them, not replace them.
- Props: radius (px), columns, intensity (the rgba alpha of the spotlight color).

Style: neutral card grid, subtle borders, the red spotlight is the only accent color — feels like a single warm light passing over a cool surface.

Output a single self-contained "use client" component using useRef + useState only (no external cursor libraries).
````
