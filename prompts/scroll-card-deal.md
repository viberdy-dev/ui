# Scroll Card Deal: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Scroll Card Deal** from scratch, or edit it first to restyle it. The finished code is [components/scroll-card-deal.tsx](../components/scroll-card-deal.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/scroll-card-deal?ref=github).

````text
Create a React + Tailwind + Framer Motion component named ScrollCardDeal — a stack of cards that deals outward into a fan as the user scrolls.

Behavior:
- A tall section (about 200vh) containing a sticky card stack. As the section passes through the viewport, the cards fan out from a single pile: translating horizontally, straightening vertically, rotating outward, and scaling from 0.9 to 1.
- Card i's horizontal offset and rotation are proportional to (i - (total - 1) / 2), so the fan is symmetric about the centre regardless of how many cards there are.

Implementation requirements:
- Drive it with useScroll({ target: sectionRef, offset: ["start end", "end start"] }) so progress is tied to the SECTION's passage through the viewport, not absolute page position. That is what makes the component drop into any page without retuning.
- Give each card an OVERLAPPING slice of the progress range — start = (i / total) * 0.8, end = start + 0.35 — so the deal reads as one continuous motion instead of N discrete steps.
- Each card must be its OWN component, not a callback inside .map(). useTransform is a hook and must run at a component's top level; calling it in a map callback breaks the rules of hooks as soon as the list length can change.
- Animate only transform and opacity so the whole thing stays on the compositor.

Props: cards (array of {id, title}), spread (number multiplier), rotation (degrees per card).

Output a single self-contained "use client" component.
````
