# Pointer Lit Card: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Pointer Lit Card** from scratch, or edit it first to restyle it. The finished code is [components/pointer-lit-card.tsx](../components/pointer-lit-card.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/pointer-lit-card?ref=github).

````text
Build a React + Tailwind card, `PointerLitCard({ children, accent, tilt, radius, className, style })`, lit from the pointer.

Structure: an outer div with 1px padding and a white 14% background (the hairline), a radial-gradient layer on it (240px circle at var(--mx) var(--my): accent 90%, accent 25% at 40%, transparent at 72%) with opacity var(--lit), then an inner surface (#0b0b0d, radius minus 1) holding a wash layer (a 380px white 7.5% radial over a 640px accent 5% radial, same centre, opacity var(--lit)) and the content in a div translated by var(--px) var(--py).

On pointermove, write --mx and --my as percentages of the card, --lit 1, --rx/--ry (up to `tilt` degrees toward the pointer, via perspective(1000px) rotateX/rotateY on the outer div) and --px/--py (up to 3px the other way); on leave, reset them with a 600ms settle (a --td variable switches the transition from 180ms while moving). Never use React state for the pointer. Focus inside sets the light to the top centre; blur that leaves the card resets it. Reduced motion: light only, no tilt or parallax.

Dark Precision grammar: ground #050505, surfaces #0b0b0d and #121215, hairlines white 6% at rest and 14% lit (drawn as inset box-shadows or SVG strokes, never border colours), ink white 92/60/38%, one cool accent used only as light (default #4fd1ff; mint #5ef2c1, amber #ffb45e, white #f2f4f7 or any #rrggbb, validated against /^#[0-9a-fA-F]{6}$/), Geist never heavier than 600 with tight tracking, Geist Mono only for captions and data, fonts through CSS variables with fallbacks (var(--font-sans, "Geist", ...)). Morphs use cubic-bezier(0.16, 1, 0.3, 1); ambient loops are 30s or slower. Respect prefers-reduced-motion. No dependencies beyond React.
````
