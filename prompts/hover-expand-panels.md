# Expanding Panel Row: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Expanding Panel Row** from scratch, or edit it first to restyle it. The finished code is [components/hover-expand-panels.tsx](../components/hover-expand-panels.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/hover-expand-panels?ref=github).

````text
Create a React + Tailwind component named HoverExpandPanels — a horizontal accordion of image panels.

Behavior:
- A row of panels. Hovering or focusing one expands it while its neighbours compress to make room. Leaving the row returns every panel to equal width.
- Each panel shows a monospace index in the top-left at all times, and a title in the bottom-left that fades and slides up ONLY while that panel is expanded (with a ~140ms delay so the label arrives after the width settles, not during it).

Implementation requirement (important):
- Drive the widths with flex-grow and flex-basis: 0, NOT measured pixel widths or percentages. Set flexGrow to expandRatio for the active panel and 1 for the rest. The row then always sums to the container regardless of panel count or container width — nothing to recompute on resize, and panels can never overflow the box.
- Add min-w-0 to each panel so it can compress below its content's intrinsic width.
- Transition only flex-grow (500ms, cubic-bezier(0.16, 1, 0.3, 1)).
- Wire onFocus/onBlur alongside the mouse events, and give each panel an aria-label, since the visible title is hidden while collapsed.

Props: panels (array of {id, label, image}), expandRatio (number).

Output a single self-contained "use client" component.
````
