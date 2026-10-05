# Beam Connector: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Beam Connector** from scratch, or edit it first to restyle it. The finished code is [components/beam-connector.tsx](../components/beam-connector.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/beam-connector?ref=github).

````text
Build a React primitive, `BeamConnector({ containerRef, from, to, fromSide, toSide, accent, duration, delay, lane, radius, active })`, that draws a beam between two elements inside a relatively positioned container.

Resolve from and to as refs or as CSS selectors via container.querySelector. Measure both boxes relative to the container in layout pixels (rect offset times container.offsetWidth / rect.width) with a ResizeObserver on all three and a window resize listener. Take each end's port (the midpoint of the chosen side) and route: both horizontal sides -> a vertical segment at lane between them; both vertical -> a horizontal segment at lane; mixed -> one corner. Round each corner with an arc of radius min(radius, half of either adjacent segment), choosing the sweep from the turn's cross product, and compute the exact length (straights plus pi/2 * r per corner).

Render an aria-hidden SVG the size of the container: the path as a white 14% hairline, then (while active and motion is allowed) three copies with dash arrays of 96, 56 and 10px (blurred glow at 28%, accent core, white head) animated by one keyframe on stroke-dashoffset from var(--d) to var(--d) - var(--len) - var(--dmax) during the first 30% of `duration`, so the three heads stay aligned; plus a circle at the far end that flashes (scale and fade) at 30%. Put the keyframes in a <style> inside the SVG.

Dark Precision grammar: ground #050505, surfaces #0b0b0d and #121215, hairlines white 6% at rest and 14% lit (drawn as inset box-shadows or SVG strokes, never border colours), ink white 92/60/38%, one cool accent used only as light (default #4fd1ff; mint #5ef2c1, amber #ffb45e, white #f2f4f7 or any #rrggbb, validated against /^#[0-9a-fA-F]{6}$/), Geist never heavier than 600 with tight tracking, Geist Mono only for captions and data, fonts through CSS variables with fallbacks (var(--font-sans, "Geist", ...)). Morphs use cubic-bezier(0.16, 1, 0.3, 1); ambient loops are 30s or slower. Respect prefers-reduced-motion. No dependencies beyond React.
````
