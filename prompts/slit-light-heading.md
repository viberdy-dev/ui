# Slit Light Heading: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Slit Light Heading** from scratch, or edit it first to restyle it. The finished code is [components/slit-light-heading.tsx](../components/slit-light-heading.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/slit-light-heading?ref=github).

````text
Build a React text effect, `SlitLightHeading({ children, as, accent, scrollRoot, className, style })`, that stacks three copies of a heading.

The base copy (in flow, readable) is white at 26%. An aria-hidden trail copy in white 92% is masked with linear-gradient(90deg, #000 calc(var(--p) - 7%), transparent calc(var(--p) + 1%)). An aria-hidden slit copy in pure white with an accent text-shadow (0 0 18px) is masked to a narrow band: transparent at var(--p) - 3.5%, black at var(--p), transparent at var(--p) + 3.5%. A 1px absolutely positioned line at left: var(--p), extending 14% above and below, carries an accent-to-white vertical gradient and a glow, with opacity var(--o) so it fades out near either end.

On scroll (rAF-throttled) and resize, compute k = (0.88 * viewportHeight - top) / (0.5 * viewportHeight) clamped to 0-1, using the scroll root's rect when given (or a site-wide context), else the window; set --p = -12% + k * 124% and --o from the distance to either end. Reduced motion sets k to 1.

Dark Precision grammar: ground #050505, surfaces #0b0b0d and #121215, hairlines white 6% at rest and 14% lit (drawn as inset box-shadows or SVG strokes, never border colours), ink white 92/60/38%, one cool accent used only as light (default #4fd1ff; mint #5ef2c1, amber #ffb45e, white #f2f4f7 or any #rrggbb, validated against /^#[0-9a-fA-F]{6}$/), Geist never heavier than 600 with tight tracking, Geist Mono only for captions and data, fonts through CSS variables with fallbacks (var(--font-sans, "Geist", ...)). Morphs use cubic-bezier(0.16, 1, 0.3, 1); ambient loops are 30s or slower. Respect prefers-reduced-motion. No dependencies beyond React.
````
