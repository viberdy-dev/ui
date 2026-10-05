# Testimonial Carousel: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Testimonial Carousel** from scratch, or edit it first to restyle it. The finished code is [components/testimonial-carousel.tsx](../components/testimonial-carousel.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/testimonial-carousel?ref=github).

````text
Create a React + Tailwind + Framer Motion "testimonial carousel" component named TestimonialCarousel.

Behavior:
- Cycles through a list of {quote, name, role} testimonials, auto-advancing on an interval (pausable via an `autoAdvance` prop) plus manual prev/next buttons and dot indicators.
- Track state as a [index, direction] tuple, not just index — direction (+1 or -1) records which way the user/timer moved, so the AnimatePresence exit/enter animation can slide the correct way (new slide enters from the direction of travel, old slide exits the opposite way). A plain index alone can't express "which direction did we just move," since going from index 2 to 0 by wrapping forward looks identical to going from 2 to 0 by going backward if you only diff the numbers.
- Use AnimatePresence (mode="popLayout") keyed on the index for the slide swap.
- Props: testimonials (array), autoAdvance (boolean), interval (ms between auto-advances).

Style: quote-mark icon, bold quote text, small muted attribution line, dot progress indicators, small prev/next icon buttons.

Output a single self-contained "use client" component.
````
