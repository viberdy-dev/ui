# 3D Card Carousel: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **3D Card Carousel** from scratch, or edit it first to restyle it. The finished code is [components/card-carousel-3d.tsx](../components/card-carousel-3d.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/card-carousel-3d?ref=github).

````text
Create a React + Tailwind + Framer Motion "3D card carousel" component named CardCarousel3D.

Behavior:
- A set of cards arranged as if mounted on the inside of a 3D ring/drum, with the currently-active card facing forward and centered, and other cards rotated away to the sides (and partially hidden behind the active one), producing a real 3D carousel feel rather than a flat horizontal slide.
- The container needs `perspective` (e.g. 900px) set via inline style for the 3D effect to render, and the inner track needs `transform-style: preserve-3d` so child rotateY transforms compose in 3D space instead of flattening.
- Track the active card index in state. For each card, compute its offset from the active index (index - active), turn that into a rotateY angle (offset * (360 / totalCards)), and animate each card's rotateY plus a z-translation (larger z / pushed forward for the active card, smaller for others) plus opacity (fade out cards more than 1 step away so the ring doesn't look cluttered with far-side cards). Use Framer's animate prop with a spring transition so switching the active card smoothly rotates the whole ring rather than snapping.
- IMPORTANT: this per-card calculation is plain arithmetic done inline in the .map() callback, not a Framer hook call (no useTransform per card needed here) — so mapping directly in the parent component is fine and does NOT violate the rules of hooks. Only extract a subcomponent if you introduce a per-card hook call.
- Provide prev/next buttons that increment/decrement the active index (wrapping around with modulo).
- Props: cards (array of card labels).

Style: cards with a shadow for depth, rounded corners, centered layout, spring-based rotation (not linear).

Output a single self-contained "use client" component.
````
