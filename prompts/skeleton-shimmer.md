# Skeleton Shimmer Loader: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Skeleton Shimmer Loader** from scratch, or edit it first to restyle it. The finished code is [components/skeleton-shimmer.tsx](../components/skeleton-shimmer.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/skeleton-shimmer?ref=github).

````text
Create a React + Tailwind "skeleton shimmer loader" asset named SkeletonShimmer.

Behavior:
- Renders placeholder blocks (a circular avatar block + N rounded text-line blocks, last line shorter to look like a natural line-wrap) each with a flat neutral background color representing "loading" content.
- Every placeholder block shares a class whose ::after pseudo-element is an absolutely-positioned inset-0 overlay with a horizontal linear-gradient (transparent → semi-opaque light → transparent) that continuously sweeps left-to-right via a @keyframes translateX animation (starting at -100%, animating to 100%), ease-in-out, infinite.
- Each block needs position: relative + overflow: hidden so the sweeping ::after is clipped to that block's own rounded shape rather than sweeping across the whole row as one rectangle.
- Props: rows (number of text-line placeholders), avatar (boolean, show/hide the circular block), speed (seconds per sweep).
- Pure CSS — no JavaScript animation loop, no useState/useEffect needed.

Style: flat neutral gray blocks, fully rounded pill-shaped lines, soft shimmer highlight — the standard "content is loading" pattern seen in most modern apps, but implemented cleanly with one shared shimmer class rather than duplicated per-block CSS.

Output a single self-contained component using only CSS keyframes via inline styled-jsx (or equivalent scoped styles) for the sweep — no JS timers.
````
