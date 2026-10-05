# Animated Checkbox: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Animated Checkbox** from scratch, or edit it first to restyle it. The finished code is [components/animated-checkbox.tsx](../components/animated-checkbox.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/animated-checkbox?ref=github).

````text
Create a React + Tailwind + Framer Motion "animated checkbox" component named AnimatedCheckbox.

Behavior:
- A custom checkbox (a styled span with role="checkbox", aria-checked, and tabIndex + keyboard handling for Space/Enter — not a hidden native <input>, so the tick SVG can be a direct child) that toggles a boolean checked state on click or Space/Enter.
- The checkmark is an SVG <path> (a simple check shape) whose Framer Motion `pathLength` is animated between 0 and 1 based on the checked state — pathLength 0 means the stroke is entirely undrawn, 1 means fully drawn — so checking it visually TRACES the tick in stroke-by-stroke rather than fading or popping an icon in. Also animate opacity 0->1 alongside pathLength so there's no flash of a fully-transparent-but-drawn path.
- The box background/border color also transitions (Tailwind transition-colors) between unchecked and checked colors.
- Fully keyboard accessible: role="checkbox", aria-checked reflecting state, tabIndex={0}, onKeyDown handling " " and "Enter" with preventDefault.
- Props: label, defaultChecked.

Style: rounded square box, brand-colored fill + white check when checked, neutral border when unchecked, label text beside it.

Output a single self-contained "use client" component.
````
