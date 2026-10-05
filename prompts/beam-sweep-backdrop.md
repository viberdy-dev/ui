# Beam Sweep Backdrop: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Beam Sweep Backdrop** from scratch, or edit it first to restyle it. The finished code is [components/beam-sweep-backdrop.tsx](../components/beam-sweep-backdrop.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/beam-sweep-backdrop?ref=github).

````text
Create a React + Tailwind component named BeamSweepBackdrop — slow rotating light beams behind page content.

Behavior:
- Wraps children. Renders N layers (beams prop), each a large square div centered in the container at a negative z-index.
- Each layer's background is a conic-gradient producing one narrow wedge of accent color against transparent, starting at a different angle per layer.
- Each layer is heavily blurred and rotates slowly, at a DIFFERENT duration per layer and with alternating direction, so the composite pattern never visibly repeats on a short loop.
- A radial vignette on top fades the beams out toward the edges.

Critical implementation notes:
- Put "isolate" on the wrapper. position: relative alone does NOT create a stacking context, so without it the negative-z-index beams escape behind the page background.
- Define your OWN @keyframes (e.g. beam-sweep-rotate) in a static <style> tag rather than relying on Tailwind's "spin" — that keyframe is only emitted when an animate-spin utility appears in the scanned source, which a copied-out component cannot assume.
- The keyframe must include the centering translate: an animation on "transform" REPLACES the class-based -translate-x-1/2 -translate-y-1/2 rather than composing with it, so write "transform: translate(-50%, -50%) rotate(360deg)".
- Do not interpolate values into the <style> block. Per-instance duration/direction belong in inline style.
- CSS only — no canvas, no requestAnimationFrame. Only transform and opacity animate, so it stays on the compositor.

Props: children (ReactNode), beams (number), speed (seconds for the base layer), blur (px).

Output a single self-contained "use client" component.
````
