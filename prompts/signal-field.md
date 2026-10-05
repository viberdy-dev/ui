# Signal Field: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Signal Field** from scratch, or edit it first to restyle it. The finished code is [components/signal-field.tsx](../components/signal-field.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/signal-field?ref=github).

````text
Create a React + Tailwind component named SignalField: a full-bleed canvas background of small square dots on a fixed grid, lit by slow waves of light, with a pointer lens and click ripples.

Look:
- Dots sit on a regular grid (`spacing` px, default 22), centred so both margins match.
- Each dot's brightness comes from three slow, overlapping sine/cosine waves in x, y and a radial term, so soft bands of light roll diagonally across the grid. A full swell should take around 20 seconds; this sits behind headlines and must never pull the eye off them.
- Dimly lit dots use `color` (default #e8eaee) at low alpha. Dots above a brightness threshold switch to `tint` (default #79a4ff), grow slightly, and get a faint wider square behind them as bloom, so the brightest crests read as accent-coloured light.
- `color` and `tint` accept any CSS colour OR a custom property like "var(--accent)". Resolve the variable with getComputedStyle, wrap bare HSL channels ("222 47% 11%") in hsl(), and fall back to the default for anything CSS.supports("color", …) rejects. Re-resolve when the html element's class/style changes (theme switch) using a MutationObserver. Keep the var() pattern linear-time: no nested quantifiers.

Interaction:
- Pointer lens: within `lens` px of the pointer, dots brighten and are pushed outward with a SQUARED falloff (k = 1 - d / lens; f = k * k), so there is no visible circular seam. Ease the lens position and strength with TIME-based exponential smoothing (factor = 1 - exp(-dt / tau), tau about 0.11 s for position and 0.2 s for strength) so it glides the same on 60 Hz and 120 Hz displays. On first entry, jump the lens to the pointer instead of sweeping in from off-screen.
- Click or tap (when `ripples` is true): a ring of light expands from the point at about 380 px/s and fades over about 1.9 s. Keep at most four rings.
- Listen for pointer events on the canvas's PARENT element, not the canvas, so text and buttons layered above the background never block the lens. The canvas itself is pointer-events: none.

Implementation requirements:
- One <canvas>, absolutely positioned at 100% width and height of its parent. Measure the parent with clientWidth/clientHeight (its LAYOUT size), never getBoundingClientRect: the rect includes ancestor transforms, so inside a scaled card the grid would only fill part of the box. Convert pointer coordinates back the other way (multiply the offset from the rect by width / rect.width). Size the backing store by devicePixelRatio (capped at 2, and lowered so the canvas stays under about 8 megapixels), apply it with ctx.setTransform, and re-layout with a ResizeObserver on the parent.
- Compute x, y and light for every dot into a reused Float32Array (allocate nothing per frame), then draw in three passes: resting dots, the bloom behind lit dots, then the lit dots. The fill style then changes three times per frame instead of once per dot.
- Hold props in a ref synced from an effect, so a prop change adjusts the next frame instead of restarting the loop. `spacing`, `color` and `tint` are read at layout time, so that same effect must also re-run the layout and re-resolve the colours, or those props stop working after mount.
- Pause the requestAnimationFrame loop when the parent scrolls out of view (IntersectionObserver) or the tab is hidden.
- prefers-reduced-motion: draw a single still frame and disable the lens and ripples.
- Clean everything up on unmount: cancel the frame and disconnect the observers and listeners.

Props: spacing (number), speed (number, a wave speed multiplier where 0 holds the light still), lens (number, px radius where 0 turns the lens off), ripples (boolean), color (string), tint (string), className (string).

Output one self-contained "use client" component with no dependencies beyond React.
````
