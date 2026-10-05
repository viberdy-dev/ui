# Theme Toggle Sun Moon Morph: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Theme Toggle Sun Moon Morph** from scratch, or edit it first to restyle it. The finished code is [components/theme-toggle-sun-moon-morph.tsx](../components/theme-toggle-sun-moon-morph.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/theme-toggle-sun-moon-morph?ref=github).

````text
Create a React + Tailwind + Framer Motion "sun/moon morph theme toggle" component named ThemeToggleSunMoonMorph.

Behavior:
- A track+thumb switch (same explicit-left-position thumb pattern as any other boolean toggle — position the thumb with a real coordinate, don't rely on an implicit static position plus a translate, which can render the thumb outside the track).
- Inside the thumb, an inline SVG icon that MORPHS between sun and moon rather than swapping two separate icon components: a center circle stays present throughout (color animates orange -> near-black), 8 sun rays (positioned via rotate + transformOrigin at the icon's center) scale/fade to 0 when switching to dark, and a second circle ("the bite") fades in and slides across the main circle to carve out a crescent-moon shape.
- IMPORTANT: the "bite" circle's fill must match the THUMB's own background color (white), not the page/canvas background — its whole job is to visually mask part of the main circle by sitting on top of it in the same color as what's directly behind it (the thumb), not the color of whatever is behind the thumb itself.
- Props: onChange (fires with the new dark boolean).

Style: compact pill switch, warm orange sun state, near-black moon state, smooth spring thumb slide.

Output a single self-contained "use client" component.
````
