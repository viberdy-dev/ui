# Animated Stat Grid: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Animated Stat Grid** from scratch, or edit it first to restyle it. The finished code is [components/animated-stat-grid.tsx](../components/animated-stat-grid.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/animated-stat-grid?ref=github).

````text
Create a React + Tailwind + Framer Motion "animated stat grid" component named AnimatedStatGrid.

Behavior:
- A grid of stat cells (value + suffix + label), each rolling up from 0 to its target number the moment IT scrolls into view.
- Each cell is its OWN subcomponent with its own useRef + useInView(once: true) and its own requestAnimationFrame tween (cubic ease-out: 1 - (1-t)^3) driving a local display value — do not share one observer/animation loop across the whole grid, since cells can enter the viewport at slightly different times depending on grid position and each needs its own independent trigger and RAF loop.
- Cancel the animation frame on unmount/dependency change.
- Props: stats (array of {value, suffix, label}), duration (seconds per count-up).

Style: a row of 3 (or however many) bordered cells, big black tabular-nums number with a red suffix, small muted label beneath.

Output a single self-contained "use client" component.
````
