# Badge Ping Counter: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Badge Ping Counter** from scratch, or edit it first to restyle it. The finished code is [components/badge-ping-counter.tsx](../components/badge-ping-counter.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/badge-ping-counter?ref=github).

````text
Create a React + Tailwind + Framer Motion "badge ping counter" component named BadgePingCounter.

Behavior:
- An icon button with a numeric badge in the corner. Each time the count increments, TWO things happen simultaneously: the badge number itself bounces in via AnimatePresence (mode="popLayout", spring transition, keyed on the count value so React treats each new number as a fresh element to animate), and a one-shot expanding "ping" ring plays behind the badge (scale from 1 to ~2.2 while fading opacity to 0), keyed on a `ring-${count}` string so it replays fresh on every single increment rather than only animating the first time.
- This is a per-increment ONE-SHOT effect, not a continuously looping pulse (that's a different, idle-state pattern) — the ring only plays exactly once per increment because its key changes each time, forcing a fresh mount.
- Props: initialCount.

Style: small circular icon button, red badge pill in the top-right corner, ping ring the same red at lower opacity.

Output a single self-contained "use client" component.
````
