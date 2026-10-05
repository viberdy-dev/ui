# Headline Switch Hero: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Headline Switch Hero** from scratch, or edit it first to restyle it. The finished code is [components/headline-switch-hero.tsx](../components/headline-switch-hero.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/headline-switch-hero?ref=github).

````text
Create a React + Tailwind (v4) component named HeadlineSwitchHero: a hero for a trade or salon where the second line of the headline is a row of the things the business does, set at headline size, and choosing one swaps the photo plate, the line of copy and the price in the plate's corner. Nothing changes on a timer.

Data: `trades`, an array of { word, copy, image?, meta?, href? }. Props: trades, lead (first headline line, default "Fitted for"), field (plate colour, hex), paper, ink (hex; validate all three with a regex and default), ctaLabel, ctaHref, phone (tel: link), tag (mono microcopy top-left), defaultIndex, onChange(trade, index), className.

Layout (the section is a `@container`; wide layout at @3xl):
- Wide: copy on the left, the plate as the right 42% at full height. Narrow: the plate is a band across the top at 38% of the height, copy below.
- Copy column: `tag` top-left in 11px uppercase monospace, 0.18em tracking, ink at 60%. The headline is an h1: line one is `lead` at 44px (112px wide), font-black, uppercase, tracking -0.05em, leading 0.86; line two is the tablist of trade words at the same size. The chosen word is solid ink; the others are hollow — colour transparent with -webkit-text-stroke 1.5px in ink at 70% — and the swap transitions over 500ms cubic-bezier(0.22, 1, 0.36, 1).
- Below: the chosen trade's `copy` at 15px/18px, max 36ch, ink at 82%, fading in over 700ms with a keyframe (re-keyed on change); a button filled INK with paper text (not the accent — one saturated field per screen), 44px tall, 12px uppercase monospace; and the phone as a tel: link beside it.
- Plate: background is `field`. Photographs are rendered with filter grayscale(1) contrast(1.25) brightness(1.05), mix-blend-mode multiply, opacity 0.92, object-fit cover, so any photo belongs to the plate colour. Each change of trade adds a new layer that fades in over 700ms on top of the previous one; keep only the last two layers (a render-time state adjustment, not an effect). Corners in paper-coloured 11px mono: "01 / 03" top-right, the trade's `meta` bottom-left.
- Only accept http(s), root-relative or data:image image sources, after stripping tabs/newlines and rejecting any backslash (a URL parser reads "\" as "/", so "/\evil.com/x.png" is another origin); sanitise hrefs the same way (strip tabs/newlines, reject backslashes, allow relative paths, fragments, http(s), mailto and tel; otherwise "#").

Behaviour and accessibility:
- The word row is role="tablist" with aria-label; each word is a button with role="tab", aria-selected, aria-controls pointing at the plate (role="tabpanel", aria-labelledby the active tab), and a roving tabindex. Arrow Left/Right/Up/Down move and select (wrapping), Home and End jump; focus follows the selection. Generate ids from useId, stripped to alphanumerics.
- A visible focus ring on the tabs and the button.
- A style element with static text only: the fade keyframe and a prefers-reduced-motion rule that removes animation and transitions from elements carrying a data attribute.

Output one self-contained "use client" component with no dependencies beyond React, exporting the Trade type.
````
