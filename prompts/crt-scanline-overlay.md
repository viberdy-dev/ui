# CRT Scanline Overlay: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **CRT Scanline Overlay** from scratch, or edit it first to restyle it. The finished code is [components/crt-scanline-overlay.tsx](../components/crt-scanline-overlay.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/crt-scanline-overlay?ref=github).

````text
Create a React + Tailwind component named CrtScanlineOverlay — a CRT monitor overlay laid over arbitrary children.

Compose FOUR stacked pointer-events-none, aria-hidden layers over the content:
1. Horizontal scanlines: repeating-linear-gradient(to bottom, rgba(0,0,0,opacity) 0px, rgba(0,0,0,opacity) 1px, transparent 1px, transparent {lineGap}px).
2. Aperture grille: repeating-linear-gradient(to right, ...) cycling faint red/green/blue at 1px each over a 3px period, with mix-blend-overlay. This layer is what makes it read as a real tube instead of generic stripes — do not skip it.
3. A rolling refresh bar: a ~64px tall soft white gradient band animating translateY from -100% to 240%, linear and infinite, over a duration the caller sets. Default it slow — around twelve seconds. A fast roll reads as a fault rather than as a refresh, and it is the single most fatiguing part of a CRT treatment when it sits behind text.
4. A corner vignette: radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%).

Requirements:
- Use repeating CSS gradients, NOT images — a few hundred bytes, resolution-independent, and crisp at any DPR.
- Put "isolate" on the wrapper so the stacking context is contained.
- Define @keyframes in a STATIC <style> block with no interpolated values; per-instance numbers go in inline style.

Props: children (ReactNode), lineGap (px between scanlines), intensity (0-100 scanline darkness), roll (boolean), rollSeconds (number).

Output a single self-contained "use client" component.
````
