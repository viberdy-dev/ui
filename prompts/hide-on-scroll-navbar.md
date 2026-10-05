# Hide On Scroll Navbar: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Hide On Scroll Navbar** from scratch, or edit it first to restyle it. The finished code is [components/hide-on-scroll-navbar.tsx](../components/hide-on-scroll-navbar.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/hide-on-scroll-navbar?ref=github).

````text
Create a React + Tailwind + Framer Motion "hide on scroll navbar" component named HideOnScrollNavbar.

Behavior:
- A fixed-position navbar that slides up out of view when the user scrolls DOWN, and slides back down into view when they scroll UP, at any scroll position past a small threshold near the top.
- Use Framer Motion's `useScroll()` to get the scrollY motion value, and `useMotionValueEvent(scrollY, "change", ...)` to react to every update — compare the new y value to the previous one (tracked in a ref, not state, to avoid triggering extra renders) to derive scroll direction. Only flip the hidden state when the delta exceeds a small noise threshold (e.g. 4px) so tiny scroll jitter doesn't cause flicker.
- Animate the navbar's own y translate between 0% and -100% based on the hidden boolean, with a real CSS/Framer transition, not an instant toggle.
- Props: children (the navbar's own content — logo, links, etc.).

Style: fixed to the top, subtle backdrop blur, bottom border, smooth slide transition.

Output a single self-contained "use client" component.
````
