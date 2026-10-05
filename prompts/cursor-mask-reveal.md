# Cursor Mask Reveal: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Cursor Mask Reveal** from scratch, or edit it first to restyle it. The finished code is [components/cursor-mask-reveal.tsx](../components/cursor-mask-reveal.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/cursor-mask-reveal?ref=github).

````text
Create a React + Tailwind component named CursorMaskReveal — the pointer punches a hole through a top layer to reveal a different layer underneath.

Behavior:
- Takes two ReactNode props: `base` (revealed underneath) and `top` (the layer the pointer cuts through). Both fill the container absolutely.
- On mouse move, a soft circular hole in the top layer follows the pointer. On mouse leave the top layer is solid again.

Implementation requirements:
- Use a real CSS mask on the top layer: maskImage = radial-gradient(circle {radius}px at var(--mx) var(--my), #000 {100-feather}%, transparent 100%). Set BOTH maskImage and WebkitMaskImage — Safari still needs the prefix.
- This must be a MASK, not a radial gradient tinted over the content. A gradient overlay only produces a bright spot; a mask reveals genuinely different markup, which is the point.
- Write pointer position to CSS custom properties (--mx / --my) from a ref. Do NOT use React state for position — the mask must follow at pointer speed without a re-render per pixel. Only the boolean "is hovered" is state.
- Initialise --mx / --my to 50% on the container so there is a defined position before first move.

Props: base (ReactNode), top (ReactNode), radius (px), feather (0-100, edge softness).

Output a single self-contained "use client" component.
````
