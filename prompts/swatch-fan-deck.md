# Swatch Fan Deck: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Swatch Fan Deck** from scratch, or edit it first to restyle it. The finished code is [components/swatch-fan-deck.tsx](../components/swatch-fan-deck.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/swatch-fan-deck?ref=github).

````text
Create a React + Tailwind component named SwatchFanDeck: a fan deck of paint chips that spreads out like a hand of cards on hover, touch or focus, and works as an accessible colour picker.

Data: an array of swatches, each { name, colour (any CSS colour), code? }. Props: swatches, value (controlled colour), defaultValue, onChange(swatch), spread (degrees between neighbours, default 14), chipWidth (64), chipHeight (150), label (group name), paper (card stock colour, default #f7f5f0), ink (#0e0e0c), className.

Look:
- Each chip is a button on card stock: a painted area filling the chip with 4px of paper around it, a small dark punch hole near the top (a 8px circle, rgba(0,0,0,0.5) with an inset shadow), and beneath the paint the name and code in 9px uppercase monospace, tracking 0.06em, the code at 60% opacity. Rounded 3px, a hairline ring via box-shadow.
- All chips are absolutely positioned at top 0, horizontally centred (left 50% with a negative margin of half the width), and rotated about a pivot 56px BELOW the chip's bottom edge (transform-origin "50% <chipHeight + 56>px"). Chip i is rotated (i − mid) × spread degrees when open, and (i − mid) × 1.6 degrees when closed so the stack still reads as a deck. The selected chip, while open, also translates up 16px, gets a deeper shadow and the highest z-index.
- Size the container from the geometry so nothing clips: width = 2 × pivot × sin(maxAngle) + chipWidth + 12, height = chipHeight + pivot × (1 − cos(maxAngle)) + 8, where pivot = chipHeight + 56 and maxAngle = |mid × spread| in radians.
- Only transform and box-shadow animate, 620ms cubic-bezier(0.22, 1, 0.36, 1). Under prefers-reduced-motion, no transition (a style rule in the component).
- Under the deck, a line in 11px monospace with a colour dot, the selected name and code, marked aria-live="polite".

Behaviour:
- Open on pointerenter, focus (any chip), close on pointerleave and on blur when focus leaves the whole component (check relatedTarget against currentTarget).
- The deck is role="radiogroup" with aria-label; each chip is role="radio" with aria-checked and an aria-label of "name, code" (never the hex). Roving tabindex: only the selected chip has tabIndex 0. Arrow Right/Down move to the next chip, Left/Up to the previous (wrapping), Home and End to the ends; choosing focuses that chip's button and calls onChange.
- Support controlled (value) and uncontrolled (defaultValue) use.
- Keep button refs in an array ref written from ref callbacks; do not read refs during render.

Output one self-contained "use client" component with no dependencies beyond React, exporting the Swatch type.
````
