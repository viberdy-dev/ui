# Link Peek Preview: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Link Peek Preview** from scratch, or edit it first to restyle it. The finished code is [components/hover-link-peek.tsx](../components/hover-link-peek.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/hover-link-peek?ref=github).

````text
Create a React + Tailwind + Framer Motion component named HoverLinkPeek — an editorial link list that floats an image preview beside the pointer.

Behavior:
- Renders a list of rows (id, title, image). Hovering or focusing a row nudges its title right by ~6px and fades in a small preview card that follows the pointer.
- The card follows the pointer with a spring (stiffness 260, damping 26, mass 0.5) and is centered on it.
- The card TILTS based on pointer velocity. Derive velocity without tracking it separately: take the difference between the raw pointer motion value and its own spring-smoothed value (useTransform over [x, springX]) and map that lag through useTransform to a rotation range, clamped. A fast sweep leans the card; a slow move leaves it level.
- The card fades and scales to 0.8 when nothing is hovered.

Requirements:
- Pointer position must use useMotionValue + useSpring, never React state. Only the active row index is state.
- The preview card is decorative: mark it aria-hidden and give the img an empty alt, since the row's own text is the real link content.
- Wire onFocus/onBlur alongside onMouseEnter/onMouseLeave so keyboard users get the same preview.

Props: rows (array of {id, title, image}), tilt (number, max degrees), cardSize (number, px).

Style: rows separated by hairline rules, monospace index numbers, bold display titles.

Output a single self-contained "use client" component.
````
