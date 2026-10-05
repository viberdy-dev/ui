# Cursor Lens Magnifier: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Cursor Lens Magnifier** from scratch, or edit it first to restyle it. The finished code is [components/cursor-lens-magnifier.tsx](../components/cursor-lens-magnifier.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/cursor-lens-magnifier?ref=github).

````text
Create a React + Tailwind component named CursorLensMagnifier — a circular magnifying lens that follows the cursor.

Behavior:
- Wraps children in a relatively-positioned, overflow-hidden container.
- On mouse move, a circular lens appears centered on the pointer and the container sets cursor: none.
- Inside the lens, render a SECOND copy of the same children, scaled by zoom and translated by (size / 2 - pointerX * zoom, size / 2 - pointerY * zoom) with transform-origin top left. That formula is what keeps the magnified point pinned exactly under the cursor, so the lens reads as glass over the content rather than a floating panel.
- The lens disappears on mouse leave.

Do NOT use canvas or an image snapshot — the magnified layer should be real DOM so text stays live and always matches the original.

Props: children (ReactNode), zoom (number, default 2), size (number, px diameter, default 104).

Style: rounded-full lens, thin light border, soft drop shadow, plus a subtle inset ring highlight so it reads as glass.

Output a single self-contained "use client" component.
````
