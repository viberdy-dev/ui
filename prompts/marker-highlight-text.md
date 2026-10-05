# Marker Highlight Text: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Marker Highlight Text** from scratch, or edit it first to restyle it. The finished code is [components/marker-highlight-text.tsx](../components/marker-highlight-text.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/marker-highlight-text?ref=github).

````text
Create a React + Tailwind component named MarkerHighlight: an inline span that draws a felt-tip highlighter stroke behind its children when they scroll into view.

Look:
- The stroke is NOT a CSS background colour. Build an SVG as a data URL: viewBox 0 0 200 40, preserveAspectRatio="none", one rect (x 3, y 5, width 194, height 30, rx 2) filled with the highlight colour at the given opacity, skewed about -1.5 degrees, with a filter of feTurbulence (fractalNoise, baseFrequency "0.03 0.11", 2 octaves, a per-instance seed) feeding feDisplacementMap (scale 8) so the edges are ragged like a marker. Set it as background-image on the span with background-repeat no-repeat and background-position left center. Build the string with concatenation and encodeURIComponent; validate the colour with a strict hex regex and fall back to #d6ff00, since the string is a data URL.
- The reveal is a transition on background-size from "0% 100%" to "100% 100%", duration 900ms (prop), delay prop, easing cubic-bezier(0.22, 1, 0.36, 1). Use box-decoration-break: clone (with the -webkit- prefix) so a phrase that wraps gets a stroke on every line. Pad the span 0.04em vertically and 0.14em horizontally with a matching negative horizontal margin so the ink overshoots the letters slightly.

Behaviour:
- Props: children, colour (hex), opacity (0–1, default 0.82), duration (ms), delay (ms), active (boolean | undefined), once (boolean, default true), className.
- When `active` is undefined, observe the span with an IntersectionObserver at threshold 0.6; when it intersects, mark it seen and, if `once`, disconnect the observer. If `once` is false, unmark when it leaves. Read entries[entries.length - 1], not the first entry. Disconnect on unmount.
- When `active` is a boolean, it drives the stroke directly and no observer is attached.
- Derive a stable per-instance seed from useId (fold the characters into a number) so two phrases on one page do not share the same edge.
- Respect prefers-reduced-motion live: read the media query through useSyncExternalStore (server snapshot false) and, when it matches, set transition to none so the stroke is simply present.
- Expose data-highlighted="true|false" on the span for styling hooks.
- No React state written during render; no setState inside the effect body itself (only inside the observer callback).

Accessibility: the stroke is a background image, so nothing is added to the accessibility tree and the text remains selectable and readable. Note in a comment that highlighter is a light-ground device and the text should stay dark.

Output one self-contained "use client" component with no dependencies beyond React.
````
