# ASCII Halftone Canvas: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **ASCII Halftone Canvas** from scratch, or edit it first to restyle it. The finished code is [components/ascii-halftone-canvas.tsx](../components/ascii-halftone-canvas.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/ascii-halftone-canvas?ref=github).

````text
Create a React + Tailwind component named AsciiHalftoneCanvas — renders anything drawable on a canvas as animated ASCII art.

API:
- Takes a `draw(ctx, width, height, t)` callback that paints the source frame, plus `cols` and `invert`.
- Taking a draw callback instead of an image `src` is DELIBERATE: getImageData throws a SecurityError on a canvas that has had a cross-origin image drawn into it, which is the failure every image-based ASCII converter hits the first time it is pointed at a CDN URL. A draw callback lets the caller decide how the source gets there.

Algorithm:
- Create ONE offscreen canvas and size it to the CHARACTER grid (cols x round(cols * 0.42) — the 0.42 compensates for monospace glyphs being taller than wide). Not the display size: this way there is exactly one pixel read per glyph, so cost tracks character count rather than resolution.
- Each frame: call draw(), then getImageData once, convert each pixel to luma with the Rec. 601 weights (0.299 R + 0.587 G + 0.114 B) — NOT a flat (r+g+b)/3 average, which misjudges perceived brightness badly on saturated colors — and map it into a density ramp " .:-=+*#%@".
- Write the assembled string straight to a <pre> node's textContent via a ref. Do NOT keep the rows in React state: that is a full component render 60 times a second to update a string.
- Pass { willReadFrequently: true } to getContext("2d"). Without it a GPU-backed canvas must be read back every frame, which is much slower for a getImageData-per-frame workload.
- Cancel the animation frame on unmount.

Accessibility: wrap in an element with role="img" and a descriptive aria-label, and mark the <pre> aria-hidden — otherwise a screen reader reads thousands of punctuation characters.

Props: draw (callback), cols (number), invert (boolean), animate (boolean), speed (number, radians per second).

Output a single self-contained "use client" component.
````
