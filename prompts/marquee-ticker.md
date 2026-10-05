# Marquee Ticker: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Marquee Ticker** from scratch, or edit it first to restyle it. The finished code is [components/marquee-ticker.tsx](../components/marquee-ticker.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/marquee-ticker?ref=github).

````text
Create a React + Tailwind "marquee ticker" component named MarqueeTicker.

Behavior:
- Renders an infinite horizontal scrolling strip of items, built by duplicating the item array once and animating the doubled track by -50% translateX in a linear infinite CSS keyframe animation, so the loop is seamless.
- Pauses the animation on hover (group-hover:[animation-play-state:paused]).
- Left/right edges fade to the page background via a pointer-events-none gradient overlay so items appear to emerge/dissolve rather than clip hard.
- Props: speed (seconds for one full loop), direction ("left" | "right", reverse via animationDirection).

Style: bold large tracking-tight text, a small red bullet separator between items. Feels like a live ticker tape, not a stock logo carousel.

Output a single self-contained component using inline styled-jsx (or an equivalent scoped keyframes approach) for the marquee keyframes.
````
