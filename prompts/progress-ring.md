# Circular Progress Ring: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Circular Progress Ring** from scratch, or edit it first to restyle it. The finished code is [components/progress-ring.tsx](../components/progress-ring.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/progress-ring?ref=github).

````text
Create a React + Framer Motion "circular progress ring" component named ProgressRing.

Behavior:
- Two concentric SVG <circle> elements: a faint full-circle track, and a colored progress circle on top using the classic SVG stroke-dasharray/stroke-dashoffset trick — set strokeDasharray to the circle's circumference (2πr) and strokeDashoffset to circumference * (1 - percent/100), so animating dashoffset visually fills the ring clockwise from 0%.
- The whole <svg> is rotated -90deg (via a CSS class) so the fill starts at 12 o'clock instead of 3 o'clock.
- Uses useInView (once: true, amount: 0.8) to detect scroll-into-view, then runs a requestAnimationFrame loop (same cubic ease-out pattern as a counter: t = elapsed/duration clamped 0-1, eased = 1-(1-t)^3) driving both the numeric percentage state AND, since dashoffset is derived from that same state, the ring fill — so the number and the ring animate perfectly in sync because they share one source of truth.
- Center percentage text is absolutely centered over the SVG via a relative/absolute wrapper.
- Props: target (0-100), size (px), strokeWidth (px), duration (seconds).

Style: thin track in a faint neutral color, bold brand-accent progress arc with rounded line caps, bold numeral centered inside. Feels like a real stat/metric widget, not a spinner.

Output a single self-contained "use client" component using useRef + useState + useInView + requestAnimationFrame (no charting library, no CSS-only conic-gradient trick — the dasharray/dashoffset approach gives a crisp rounded-cap stroke that a conic-gradient mask can't).
````
