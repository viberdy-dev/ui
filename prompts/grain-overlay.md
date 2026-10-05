# Grain Overlay: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Grain Overlay** from scratch, or edit it first to restyle it. The finished code is [components/grain-overlay.tsx](../components/grain-overlay.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/grain-overlay?ref=github).

````text
Create a React "grain overlay" background component named GrainOverlay.

Behavior:
- A full-bleed, absolutely-positioned <canvas> that continuously redraws random monochrome noise (film grain) via requestAnimationFrame, using canvas ImageData directly (not CSS) for real per-pixel randomness.
- On each frame, create an ImageData buffer sized to the canvas, and for every 4th-byte-aligned pixel (stepped by a density factor to control performance/coarseness), set R=G=B to a random 0-255 shade with full alpha, then putImageData.
- The canvas is pointer-events-none, positioned absolute inset-0, sized to its parent via a ResizeObserver on the canvas element (not a one-time offsetWidth/offsetHeight read — a canvas rendered into a not-yet-laid-out or scaled container can measure 0x0 on the first paint, and createImageData(0, 0) throws) that updates canvas.width/height and skips painting a frame while either is still zero.
- Blended onto whatever sits beneath it via mix-blend-mode: overlay, at a low opacity (e.g. 0.08) so it reads as subtle texture, not visible static.
- Cancel the animation frame loop on unmount.

Style: this is a texture layer meant to sit on top of a hero, image, or dark section — invisible at a glance but adds tactile, filmic depth. Not a giant loud static effect.

GIVE THE GRAIN ITS OWN FRAME RATE. Real film runs at twenty-four frames a second; re-rolling every pixel at the display's sixty is both harsher than any photochemical grain and two and a half times the work for it. Let the loop run every frame but only REDRAW once enough time has passed, so the cost tracks the chosen rate rather than the monitor. A direct call — the first paint, or a repaint after a resize — must bypass that gate, or the static mode never paints at all, because there is no loop behind it to try again.

CLAMP THE PIXEL STEP TO AT LEAST ONE WHOLE PIXEL. The density prop divides the loop increment, so a zero makes it step by nothing: a for-loop that never advances and never exits, which is a permanently hung tab rather than a slow frame.

Props: opacity, density (pixel step), animated (boolean), fps (grain redraw rate).

Output a single self-contained "use client" component using useRef + useEffect + raw canvas 2D API only (no external noise/shader libraries).
````
