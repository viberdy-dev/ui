# Tilt Card: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Tilt Card** from scratch, or edit it first to restyle it. The finished code is [components/tilt-card.tsx](../components/tilt-card.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/tilt-card?ref=github).

````text
Create a React + Tailwind + Framer Motion "tilt card" component named TiltCard.

Behavior:
- On mouse move over the card, it rotates in 3D (rotateX / rotateY) toward the cursor position using useMotionValue + useTransform + useSpring (stiffness 200, damping 20), max tilt ~12deg.
- On mouse leave, it springs back flat.
- Parent wrapper needs perspective: 800 and the card needs transformStyle: "preserve-3d".
- Props: title (string), body (string), maxTilt (number, degrees).

Style: rounded-2xl card, subtle border, soft shadow, small red circular accent dot above the title, bold title, muted body text. Feels tactile, not a generic hover:scale card.

Output a single self-contained "use client" component.
````
