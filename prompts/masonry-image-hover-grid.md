# Masonry Image Hover Grid: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Masonry Image Hover Grid** from scratch, or edit it first to restyle it. The finished code is [components/masonry-image-hover-grid.tsx](../components/masonry-image-hover-grid.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/masonry-image-hover-grid?ref=github).

````text
Create a React + Tailwind + Framer Motion "masonry image hover grid" component named MasonryImageHoverGrid.

Behavior:
- Renders images of varying natural heights in a true masonry flow using CSS multi-column layout (`columns-N`, or `column-count` inline for a dynamic column count), NOT CSS grid — grid needs manual row-spanning math to avoid gaps with variable-height items, while columns lets browser-native masonry-like flow happen automatically. Each tile needs `break-inside-avoid` so it never gets split across two columns.
- On hover (Framer Motion's `whileHover="hover"` on the tile, with child elements declaring matching `variants`), the image scales up slightly and a caption bar fades/slides up from the bottom over a dark gradient scrim, so it stays legible over any image.
- Props: tiles (array of {src, label}), columns (number of masonry columns).

Style: tight gap between tiles, rounded corners, smooth hover scale, caption only visible on hover.

Output a single self-contained "use client" component.
````
