# Vertical Timeline Reveal: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Vertical Timeline Reveal** from scratch, or edit it first to restyle it. The finished code is [components/vertical-timeline-reveal.tsx](../components/vertical-timeline-reveal.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/vertical-timeline-reveal?ref=github).

````text
Create a React + Tailwind + Framer Motion "vertical timeline" component named VerticalTimelineReveal.

Behavior:
- Renders a list of steps stacked vertically, each with a small dot on a connecting vertical line on the left, and a title+body card to the right.
- Each item is its OWN subcomponent with its own useRef + useInView(once: true) — not one shared observer for the whole list — so each dot/card animates in independently the moment ITS OWN position scrolls into view, not all at once when the first item appears.
- The dot scales in from 0, the card fades and slides in from the left (x: -12 -> 0), each with a small index-based stagger delay so a sequence reads top-to-bottom even if several are in view simultaneously.
- The connecting line is a continuous thin element behind the dots (position it so it doesn't extend past the last item).
- Props: steps (array of {title, body}).

Style: compact left-aligned timeline, red dots, editorial card styling for the content blocks.

Output a single self-contained "use client" component.
````
