# Window Light Drift: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Window Light Drift** from scratch, or edit it first to restyle it. The finished code is [components/window-light-drift.tsx](../components/window-light-drift.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/window-light-drift?ref=github).

````text
Create a React + Tailwind component named WindowLightDrift: a full-bleed canvas background of afternoon sunlight through a window, drifting slowly across a plaster wall, with the pointer casting a soft shadow in the light.

Look:
- The wall is a flat colour (`wall`, hex, default #151412) dusted with fine grain: build a 160x160 tile of random grey pixels once, and fill the whole canvas with it as a repeating pattern using "overlay" compositing at alpha = grain * 0.34, in DEVICE pixels so it stays fine on retina.
- The light is ONE slanted shaft: a band about 46% of the width wide (at least 160px, at most 75% of the height), drawn in a coordinate space skewed by `angle` degrees (0–40, default 22) about the wall's vertical middle. Its horizontal edges are gradient ramps (transparent → light over the first and last 16%), and a vertical destination-in gradient fades the top (50%) and the floor (25%) so it never reads as a stripe.
- Window bars: `bars` (0–4, default 2) vertical shadows cut out of the shaft with destination-out gradient bars about 4.5% of the shaft width each, plus one level horizontal transom at 44% of the height.
- The shaft drifts: centre x = W/2 + sin(2π · t / T) · (W/2 − 0.35 · shaftWidth), where T = 90 s / speed, so one crossing and back takes a minute and a half at speed 1. Its brightness breathes between 0.68 and 1.0 on a 41-second sine, like passing cloud.
- Colours are hex only (validate with a regex, fall back); `light` defaults to #f4d9a6.

Interaction:
- The pointer is a hand in the light: a radial shadow (radius = 16% of the smaller dimension, at least 60px; 0.62 alpha at the centre, 0.3 at 55%, 0 at the edge) cut OUT of the light layer with destination-out, so it only exists where light falls. Ease its position and strength with time-based exponential smoothing (tau 0.22 s); on first entry appear in place rather than sweep in; fade out on pointerleave. `shadow` (boolean) turns it off.
- Listen for pointer events on the canvas's PARENT element and convert clientX/Y into layout pixels (offset from the bounding rect scaled by clientWidth / rect.width), so it works inside scaled containers and copy above it never blocks the shadow. The canvas is pointer-events: none and aria-hidden.

Implementation requirements:
- One <canvas> absolutely positioned at inset 0 of its parent; measure the parent with clientWidth/clientHeight (layout size, not getBoundingClientRect); size the backing store by devicePixelRatio capped at 2 and lowered until it stays under ~8 megapixels; re-layout with a ResizeObserver.
- Build the light on an OFFSCREEN canvas of the same size (shaft, vertical fade, bars, transom, pointer shadow), then draw the wall, the light layer, and the grain onto the visible canvas.
- Hold props in a ref synced from an effect (no ref writes during render); the sync effect redraws a still frame and restarts the loop.
- requestAnimationFrame loop with a clamped time delta (≤ 100 ms); run it only while the parent is on screen (IntersectionObserver, reading entries[entries.length - 1]), the tab is visible, and either motion is allowed with speed > 0 or the pointer shadow is still settling.
- prefers-reduced-motion: the drift and breathing stop (t no longer advances) and a single still frame is drawn; the pointer shadow keeps working because the reader drives it. Listen for the media query changing.
- Clean up the frame, observers and listeners on unmount.

Props: wall (hex), light (hex), angle (number), bars (number), speed (number), grain (0–1), shadow (boolean), className.

Output one self-contained "use client" component with no dependencies beyond React.
````
