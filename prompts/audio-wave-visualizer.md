# Audio Wave Visualizer: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Audio Wave Visualizer** from scratch, or edit it first to restyle it. The finished code is [components/audio-wave-visualizer.tsx](../components/audio-wave-visualizer.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/audio-wave-visualizer?ref=github).

````text
Create a React + Tailwind + Framer Motion "audio equalizer bar visualizer" component named AudioWaveVisualizer.

Behavior:
- A row of ~24 thin vertical bars whose heights continuously animate up and down like a music equalizer, each bar with its OWN randomized base height, duration, and delay, animated via Framer Motion's `animate` with an array of height keyframes and `repeat: Infinity, repeatType: "mirror"` — do not apply one identical shared animation to every bar, which reads as a single pulsing block instead of an organic equalizer.
- IMPORTANT SSR/hydration detail: generate the per-bar randomization with `Math.random()` inside a post-mount `useEffect`, NOT inside a `useState(() => ...)` initializer — an initializer runs during render, including any server-render pass, and `Math.random()` there produces different values server-side vs. the first client render, which React flags as a hydration mismatch. Seed the initial state with a small deterministic pattern instead (e.g. derived from each bar's index), then replace it with real randomness in a one-time effect after mount, exactly like the standard "mounted" SSR-safety pattern.
- A `playing` boolean prop: when false, all bars settle to a small flat height instead of animating.
- Props: playing, color (bar fill color).

Style: compact rounded card, thin bars with small gaps, calm continuous bounce, not jittery.

Output a single self-contained "use client" component.
````
