# Confetti Burst Button: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Confetti Burst Button** from scratch, or edit it first to restyle it. The finished code is [components/confetti-button.tsx](../components/confetti-button.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/confetti-button?ref=github).

````text
Create a React + Tailwind "confetti burst button" component named ConfettiButton.

Behavior:
- On click, generates N small square particles, each with a random angle (0-2π) and random distance (a fraction of a "spread" prop) that together compute a random (x, y) offset via cos/sin, plus a random rotation and a random pick from a small brand color palette.
- IMPORTANT for SSR/hydration correctness: Math.random() must only ever run inside the click handler, never during the component's render body or a useState initializer — generating particles eagerly at render time would bake random values into server-rendered/static HTML that then mismatch on client hydration. Particles start as an empty array and only populate reactively after a real click.
- Each particle is an absolutely-positioned span at the button's center, animated via a CSS @keyframes that translates it by CSS custom properties (--tx, --ty, --tr) set per-particle via inline style, fading opacity 1→0 over ~700ms, ease-out, forwards fill.
- After the animation duration, clear the particles array (a simple setTimeout) so old particles don't accumulate in the DOM.
- Props: label, count (particle count), spread (max travel distance in px).

Style: solid red pill button, small square/rect confetti bits in a tight brand palette (red, off-white, dark red, gray) — a quick, satisfying micro-celebration on click, not a full-screen confetti cannon.

Output a single self-contained "use client" component using useState + inline CSS custom properties for per-particle animation targets (no external confetti library).
````
