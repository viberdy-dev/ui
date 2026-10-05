# Crosshair Cursor Readout: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Crosshair Cursor Readout** from scratch, or edit it first to restyle it. The finished code is [components/cursor-crosshair-readout.tsx](../components/cursor-crosshair-readout.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/cursor-crosshair-readout?ref=github).

````text
Create a React + Tailwind component named CursorCrosshairReadout — a technical, drafting-software style cursor for a bounded container.

Behavior:
- Wraps arbitrary children in a relatively-positioned container with `cursor-none`.
- On mouse move inside the container, a full-width horizontal guide and a full-height vertical guide follow the pointer, plus a small ring and a dot at the intersection.
- A tiny monospace readout chip trails the pointer showing the pointer's X / Y position **relative to the container**, zero-padded to three digits.
- Guides fade in on mouse enter and out on mouse leave.

Performance requirement (important):
- Write pointer position to CSS custom properties (--cx / --cy) via a ref, NOT React state — the guides must not cause a re-render on every mousemove.
- Only the numeric readout uses state, and it must be throttled to one update per animation frame with requestAnimationFrame.

Props: children (ReactNode), showReadout (boolean).

Style: dashed hairline guides, monospace readout, one accent color for the center dot. Should feel like a CAD / drafting tool, not a playful cursor toy.

Output a single self-contained "use client" component.
````
