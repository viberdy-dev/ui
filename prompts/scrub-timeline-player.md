# Scrub Timeline Player: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Scrub Timeline Player** from scratch, or edit it first to restyle it. The finished code is [components/scrub-timeline-player.tsx](../components/scrub-timeline-player.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/scrub-timeline-player?ref=github).

````text
Create a React + Tailwind component named ScrubTimelinePlayer — a media scrubber with a buffered range, a draggable playhead and a hover timestamp.

Behavior:
- A track showing three layers: an empty rail, a buffered extent, and the played extent.
- A circular playhead sits at the current position and scales up slightly on hover.
- Hovering anywhere on the track shows a small monospace timestamp tooltip above that point.
- The bar grows a few px taller while actively scrubbing.

Two requirements that are the whole point of the component:

1. Use POINTER events with setPointerCapture, not mousedown/mousemove.
   On pointerdown: e.currentTarget.setPointerCapture(e.pointerId), begin scrubbing, seek.
   On pointerup: releasePointerCapture.
   Capture routes every subsequent pointer event to this element even when the pointer is OUTSIDE its bounds, so the scrub keeps working when the user drags above or below the bar — which is exactly what people do when scrubbing fast. The mouse-event version silently stops there. It also removes the need for window-level listeners and their cleanup.

2. Make it a real slider, not a div with a click handler:
   role="slider", tabIndex={0}, aria-label, aria-valuemin/max/now, and aria-valuetext carrying the FORMATTED timestamp (a bare "42" is meaningless read aloud). Handle ArrowLeft/ArrowRight to seek.

Props: duration (seconds), value (0-100), buffered (0-100), onChange (callback).

Output a single self-contained "use client" component.
````
