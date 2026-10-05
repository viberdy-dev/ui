# Stacked Type Hero: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Stacked Type Hero** from scratch, or edit it first to restyle it. The finished code is [components/stacked-type-hero.tsx](../components/stacked-type-hero.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/stacked-type-hero?ref=github).

````text
Create a React + Tailwind + Framer Motion "stacked type hero" section named StackedTypeHero.

Behavior:
- Renders a vertical stack of large, bold words (editorial / oversized type as sculpture), each on its own line, extremely tight leading (leading-[0.9]) and tight tracking.
- Each word fades and slides up into place on mount, staggered by ~60ms per word, using ease [0.16, 1, 0.3, 1].
- One designated "accent" word renders in a strong red (#FF2D2D); all others render in white/near-white against a cool gray background.
- Font size should scale fluidly with viewport using clamp().

Style: font-black weight, tight tracking, no additional decoration — the typography itself is the visual. Feels like an editorial magazine cover, not a SaaS hero.

Output a single self-contained component using framer-motion's motion.span, word list as a simple array constant.
````
