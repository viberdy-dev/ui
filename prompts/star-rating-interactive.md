# Interactive Star Rating: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Interactive Star Rating** from scratch, or edit it first to restyle it. The finished code is [components/star-rating-interactive.tsx](../components/star-rating-interactive.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/star-rating-interactive?ref=github).

````text
Create a React + Tailwind + Framer Motion "interactive star rating" component named StarRating.

Behavior:
- A row of star icons (default 5) representing a rating. Track the COMMITTED rating in one state variable, and the currently-hovered star index in a separate state variable (nullable).
- The visually "active" fill count is: hovered value if the user is currently hovering a star, otherwise the committed rating — compute this as `hovered ?? rating` so hovering previews a potential rating without changing the actual committed value until a star is clicked.
- Each star is a button; hovering over star index i sets hovered to i+1, clicking it commits rating to i+1. Moving the mouse off the whole row (onMouseLeave on the container) resets hovered back to null so the display reverts to the real committed rating.
- Each star animates a small spring scale-up (e.g. 1 -> 1.15) when it transitions from unfilled to filled, giving a satisfying "pop" as the hovered/rated range grows.
- A filled star renders with fill="currentColor"; an unfilled one renders with fill="none" (outline only) — toggle this per-star based on whether its index is less than the active count.
- Props: max (number of stars), defaultRating.

Style: accent-colored stars, outline-only when unfilled, smooth spring pop on fill.

Output a single self-contained "use client" component.
````
