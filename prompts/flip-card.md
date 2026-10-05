# 3D Flip Card: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **3D Flip Card** from scratch, or edit it first to restyle it. The finished code is [components/flip-card.tsx](../components/flip-card.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/flip-card?ref=github).

````text
Create a React + Tailwind + Framer Motion "3D flip card" component named FlipCard.

Behavior:
- Two faces (front, back) stacked absolutely on top of each other inside a wrapper with CSS perspective (`[perspective:1000px]` on the outer element).
- The card itself has `[transform-style:preserve-3d]` so its children's 3D transforms compose correctly, and each face has `[backface-visibility:hidden]` so only the face currently pointed at the viewer is legible — the other is invisible, not just faded.
- The back face is pre-rotated 180deg on Y so it sits "behind" the front face until the card itself rotates.
- Flip is driven by animating rotateY on the card wrapper via Framer Motion, from 0deg to 180deg, using a real 3D rotation (never a cross-fade or scaleX flip — those aren't a true flip).
- Support two trigger modes via a `trigger` prop: "hover" (use Framer's whileHover to flip only while the pointer is over the card, unflip on mouse-leave automatically) and "click" (toggle a boolean flipped state on click, persists until clicked again).
- Duration ~0.6s with an ease-in-out-ish cubic-bezier so the flip has real weight, not a linear spin.
- Props: frontLabel, backLabel, trigger.

Style: front face light/neutral with a border, back face a solid brand color, both centered content, generous rounded corners.

Output a single self-contained "use client" component.
````
