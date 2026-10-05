# Segmented Control: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Segmented Control** from scratch, or edit it first to restyle it. The finished code is [components/segmented-control.tsx](../components/segmented-control.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/segmented-control?ref=github).

````text
Create a React + Tailwind + Framer Motion "segmented control" component named SegmentedControl (an iOS-style tab/pill switch).

Behavior:
- A row of text options inside a rounded pill track. Exactly one option is active at a time (controlled by local state, defaulting to `defaultIndex`).
- The active highlight is ONE shared element using Framer Motion's `layoutId` (a spring transition), rendered only inside the currently-active button — Framer automatically FLIP-animates it sliding from its old position to its new one whenever a different option becomes active. Do not implement this as each button independently animating its own background — that produces a cross-fade, not the correct sliding-pill motion.
- Each label sits in a `relative z-10` span so it stays above the animated highlight, with text color switching between white (on the active pill) and muted (inactive).
- Props: options (array of labels), defaultIndex, onChange (fires with the new index).

Style: small rounded-full track with a subtle background, a solid accent-colored pill sliding behind the active label, compact padding.

Output a single self-contained "use client" component.
````
