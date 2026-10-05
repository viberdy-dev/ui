# Stroke Draw Button: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Stroke Draw Button** from scratch, or edit it first to restyle it. The finished code is [components/hover-stroke-draw-button.tsx](../components/hover-stroke-draw-button.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/hover-stroke-draw-button?ref=github).

````text
Create a React + Tailwind component named HoverStrokeDrawButton — a button whose outline draws itself on hover.

Behavior:
- The button contains an absolutely-positioned SVG behind its label (use "isolate" on the button and -z-10 on the svg so the negative z-index stays contained).
- Two <rect> outlines: a faint resting track always visible, and an accent stroke that animates.
- Animate the accent stroke with stroke-dasharray / stroke-dashoffset so the line genuinely travels around the shape instead of fading in.
- CRITICAL: set pathLength={1} on the rect. That normalises the path so dasharray and dashoffset are plain 0-1 fractions — the effect then works at ANY button size with no getTotalLength() call and no remeasure on resize. This is the whole reason to build it this way.
- dasharray "0.5 0.5" with offset animating 0.5 -> 0 gives two strokes that meet at opposite corners. dasharray "1 1" with offset 1 -> 0 gives a single stroke travelling the whole perimeter.
- Size the rects with x=1, y=1, width="calc(100% - 2px)", height="calc(100% - 2px)" and preserveAspectRatio="none" so the stroke is not clipped at the edges.
- Trigger on focus as well as hover.

Props: label (string), speed (ms), radius (number, corner radius).

Style: monospace uppercase label with wide tracking; the border is the only decoration.

Output a single self-contained "use client" component.
````
