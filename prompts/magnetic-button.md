# Magnetic Button: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Magnetic Button** from scratch, or edit it first to restyle it. The finished code is [components/magnetic-button.tsx](../components/magnetic-button.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/magnetic-button?ref=github).

````text
Create a React + Tailwind "magnetic button" component named MagneticButton.

Behavior:
- On mouse move over the button, the inner label offsets slightly toward the cursor position (magnetic pull effect), using a spring animation (Framer Motion spring: stiffness 150, damping 12, mass 0.4).
- On mouse leave, it springs back to center.
- Props: label (string), strength (number, how far it can drift in px).

Style: rounded-full pill button, bold red background (#FF2D2D), white bold text, generous horizontal padding (px-8 py-4). Feels tactile and alive, not corporate.

Output a single self-contained "use client" component using useRef + useState + framer-motion's motion.span for the inner label.
````
