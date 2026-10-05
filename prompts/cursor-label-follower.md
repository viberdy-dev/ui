# Cursor Label Follower: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Cursor Label Follower** from scratch, or edit it first to restyle it. The finished code is [components/cursor-label-follower.tsx](../components/cursor-label-follower.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/cursor-label-follower?ref=github).

````text
Create a React + Tailwind + Framer Motion component named CursorLabelFollower.

Behavior:
- Wraps children. A small pill-shaped label chip follows the pointer inside the wrapper.
- The chip's text is driven by the hovered element: any descendant carrying a data-cursor-label="View" attribute sets the label to "View". Use a single delegated onMouseOver handler with event.target.closest("[data-cursor-label]") rather than per-element handlers.
- With no labelled element under the pointer, the chip scales down to 0.7 and fades to 0.
- The chip trails the pointer with a spring (stiffness configurable, damping 30, mass 0.35).

Performance requirement (important):
- Pointer position must ride Framer Motion useMotionValue + useSpring, NOT React state. Only the label string is state, and it changes once per hovered target rather than per pixel.

Props: children (ReactNode), stiffness (number).

Style: rounded-full accent chip, white uppercase monospace text at ~10px with wide tracking, a tiny dot before the label. Centered on the pointer via -translate-x-1/2 -translate-y-1/2.

Output a single self-contained "use client" component.
````
