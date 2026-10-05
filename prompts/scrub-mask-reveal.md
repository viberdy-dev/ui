# Scrub Mask Reveal: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Scrub Mask Reveal** from scratch, or edit it first to restyle it. The finished code is [components/scrub-mask-reveal.tsx](../components/scrub-mask-reveal.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/scrub-mask-reveal?ref=github).

````text
Build a React + Tailwind primitive, `ScrubMaskReveal({ children, inset, radius, rail, progress, className, style })`.

On every scroll (no easing), v = clamp((viewTop + 0.95 x viewHeight - plateTop) / (0.45 x viewHeight + half the plate's height), 0, 1), or the progress prop. The frame gets clip-path inset(k% 1.1k% k% 1.1k% round radius) with k = inset x 100 x (1 - v); the inner picture scale(1 + 0.12 (1 - v)); a 1px rail beneath scaleX(v). Written straight to the elements; nothing is clipped before the first scroll read, so it renders open without script.

Modern Minimal grammar: a paper-white room, ground #f5f5f2 (surfaces #ffffff that lift, a recessed well #ecebe6), ink #141412 at 92/60/38% (never grey-400 body copy), hairlines at 8% and 14%; one light, dawn #ffa64d, only ever as light (the lamp's glow, a lit state), never as a fill. Shadows come from one light above in two layers: a contact 0 1px 2px rgba(20,20,18,0.06) and an ambient 0 24px 48px -12px rgba(20,20,18,0.1), both falling the same way; a pressed thing loses the ambient, a lifted one widens it. Type: Inter Tight through var(--font-inter-tight, "Inter Tight", ...) for display at 600 with -0.035em tracking and 0.98 leading (tracking tightens only at display sizes), Geist for reading at 16-17px/1.55, Geist Mono uppercase at 11-12px for readouts. Radii 12px controls (pills for buttons), 20px cards, 28px media. Motion: scroll binds values directly with no easing (a value moves exactly with the scroll, like scrubbing film); discrete hover and press states take 150-260ms with a spring back past rest; ambient loops 40s or more. Respect prefers-reduced-motion (ambient scenes hold still; scroll-bound values still follow the scroll, which the visitor drives). No dependencies beyond React.
````
