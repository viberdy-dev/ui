# Odometer Counter: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Odometer Counter** from scratch, or edit it first to restyle it. The finished code is [components/odometer-counter.tsx](../components/odometer-counter.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/odometer-counter?ref=github).

````text
Create a React + Framer Motion "odometer counter" text-effect component named OdometerCounter.

Behavior:
- Uses useInView (once: true, amount: 0.8) on a ref'd span to detect when the number scrolls into view.
- Once in view, runs a requestAnimationFrame loop measuring elapsed time against a target duration, computing progress t = elapsed/duration clamped to [0,1], applying a cubic ease-out (1 - (1-t)^3) to that progress, and setting displayed value = Math.round(eased * targetNumber).
- Stops the rAF loop once t reaches 1, and cleans it up on unmount.
- Number is formatted with toLocaleString() for thousands separators, uses tabular-nums so digit width doesn't jitter as the value changes, and only runs once (does not re-trigger on scroll back into view).
- Props: target (final number), duration (seconds), prefix/suffix strings (e.g. "$" prefix, "+" suffix), rendered in a distinct accent color.

Style: large bold display numerals, tabular-nums for stable width, suffix/prefix in the brand red accent color. Feels like a stat counter on a proof/metrics section, not a generic incrementing number.

Output a single self-contained "use client" component using useRef + useState + useInView + requestAnimationFrame (no external counting/odometer libraries).
````
