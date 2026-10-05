# Glass Etch Text: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Glass Etch Text** from scratch, or edit it first to restyle it. The finished code is [components/glass-etch-text.tsx](../components/glass-etch-text.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/glass-etch-text?ref=github).

````text
Create a React + Tailwind client component, GlassEtchText: real HTML heading text rendered as glass by an SVG filter, in a "raised" (glass letters on the page) or "etched" (letters cut into glass) cut.

Props: children, as ("h1" | "h2" | "h3" | "p" | "span", default h2), size (px number or any CSS length, default 120), weight (default 700), cut ("raised" | "etched"), light (degrees, SVG azimuth: 0 right, 90 below, 180 left, 270 above; default 225 = upper left), tint ("#rrggbb" for the glass body, regex-validated, default white), fringe (0–1, default 0.5), className, style. The element gets font-size, font-weight, line-height 0.95, tracking −0.03em, color #fff (opaque, so the filter's SourceAlpha is exactly the glyphs) and filter: url(#id), a plain CSS filter that Chrome, Safari and Firefox all run on HTML. The <filter> lives in a 0×0 absolutely positioned aria-hidden <svg> inside the element (x −8%, y −25%, 116% × 150%, color-interpolation-filters sRGB). Measure the computed font size with a ResizeObserver (fluid type changes it) and scale every filter length from it (px):

- bevel blur σ = max(0.8, 0.035px); surfaceScale = max(1, 0.05px); shadow distance d = max(0.6, 0.018px); rim width = max(0.5, 0.009px); fringe split = clamp(0.007px, 0.5, 3), so dispersion never exceeds 3px.
- L = (cos light, sin light) points toward the light (y down).
- h = SourceAlpha blurred by σ; inv = SourceAlpha inverted (feFuncA table 1 0); hInv = inv blurred by σ.
- Specular: feSpecularLighting (specularConstant 1.15, exponent 24, white, feDistantLight at the light azimuth, elevation 48) on h for raised or hInv for etched (a concave bevel), composited in SourceAlpha.
- Inner shadow: hInv offset by +L·d (raised: lands on the far wall) or −L·d (etched: lands on the wall facing the light), flooded #0a0614 at 0.42 (0.55 etched), kept inside the glyph.
- Body: the tint at 0.12 (0.2 etched) inside the glyph, so the backdrop shows through.
- Rim, graduated not uniform: edge = SourceAlpha out (SourceAlpha eroded by the rim width); probe = SourceAlpha offset by −L·1.5·rim; edgeLit = edge out probe (the rim facing the light), edgeFar = edge out edgeLit. White at 0.85 on edgeLit and 0.16 on edgeFar for raised; 0.1 and 0.6 for etched (the lip facing the light sits in shadow).
- Fringe: offset the edge band +split and −split px horizontally; keep each copy only where it does not overlap the other (feComposite out both ways), so the colour appears on the sides of strokes and never as a tinted outline along horizontal edges; flood #ff3d7f and #33c4ff at 0.7·fringe into them.
- Raised only: a drop shadow (SourceAlpha blurred 0.05px, offset −L·1.8d, black 0.24) kept outside the glyph.
- Merge: drop, body, inner shadow, the two fringes, far rim, lit rim, specular.

Output one self-contained "use client" TSX file with no dependencies beyond React. Build strings with + rather than template literals.
````
