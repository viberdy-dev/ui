# Image Comparison Slider: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Image Comparison Slider** from scratch, or edit it first to restyle it. The finished code is [components/image-comparison-slider.tsx](../components/image-comparison-slider.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/image-comparison-slider?ref=github).

````text
Create a React + Tailwind "before/after image comparison slider" component named ImageComparisonSlider.

Behavior:
- Two stacked full-size images (before, after) — the "after" image is the base layer, the "before" image sits in an absolutely-positioned wrapper clipped by a dynamic `width: pos%` style (no clip-path needed — an overflow-hidden wrapper narrower than the image underneath is enough since the image itself stays full-width inside it).
- A draggable vertical divider handle positioned at `left: pos%`, with a small circular grip icon, sitting on top of both layers.
- Dragging anywhere in the container (not just on the handle) updates `pos` — use onPointerDown + onPointerMove with `e.currentTarget.setPointerCapture(e.pointerId)` on pointer down so the drag keeps tracking even if the cursor moves faster than the mouse events fire or briefly leaves the element bounds. Compute pos as a percentage from the click/drag clientX relative to the container's own bounding rect, clamped to [0, 100].
- Only respond to pointermove when the primary button is actually held (check `e.buttons === 1`) so hovering without dragging doesn't move the slider.
- Small "Before"/"After" pill labels in the bottom corners of each layer for orientation.
- Props: before (image src), after (image src), initial (starting position 0-100), labelBefore, labelAfter.

Style: rounded container, white divider line with a circular grab handle, dark semi-transparent label pills.

Output a single self-contained "use client" component.
````
