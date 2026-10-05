# Morphing Island Notch: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Morphing Island Notch** from scratch, or edit it first to restyle it. The finished code is [components/morphing-island-notch.tsx](../components/morphing-island-notch.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/morphing-island-notch?ref=github).

````text
Create a React + Tailwind + Framer Motion component named MorphingIslandNotch — a pill that morphs between a compact and an expanded state, like a status island.

Behavior:
- Compact: a small rounded-full pill containing just an icon.
- Expanded: a wider rounded-rectangle containing the icon plus a monospace uppercase label and a bolder detail line.
- Switching between states animates the container's size fluidly with a spring (stiffness configurable, damping 34, mass 0.9).
- Text content fades and un-blurs in, and blurs out on exit, via AnimatePresence with mode="popLayout".

Two implementation requirements that are the whole point:
1. NEVER specify a width or height. Put `layout` on the container motion.div and let Framer measure its own content and animate the box to fit. Adding a new state then means adding markup, not maintaining a table of widths.
2. ANIMATE borderRadius rather than setting it with a static class. Framer's layout projection scales the box during the transition, which visibly skews a fixed corner radius. Animate it (999 collapsed, ~20 expanded) so the corners stay true throughout.

Use layout="position" on the inner icon and text block so they translate into place instead of being stretched by the parent's scale correction.

Props: icon (ReactNode), label (string | null — null collapses it), detail (string | null), stiffness (number).

Output a single self-contained "use client" component.
````
