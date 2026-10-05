# Ripple Click Effect: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Ripple Click Effect** from scratch, or edit it first to restyle it. The finished code is [components/ripple-click-effect.tsx](../components/ripple-click-effect.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/ripple-click-effect?ref=github).

````text
Create a React + Tailwind + Framer Motion "ripple click effect" button named RippleButton, Material Design style.

Behavior:
- On every click, compute the click point relative to the button (clientX/Y minus the button's own getBoundingClientRect), and spawn a ripple circle originating exactly there — never centered on the button regardless of where the user actually clicked.
- Size the ripple so it's guaranteed to cover the ENTIRE button no matter where the click landed: radius = the distance from the click point to the FARTHEST corner, i.e. `Math.hypot(Math.max(x, width - x), Math.max(y, height - y))`, doubled for diameter. A ripple sized off the button's average dimensions instead of the actual click point will visibly fail to cover a corner-click.
- Each ripple is its own tracked object in an array (unique incrementing id, x, y, size) so multiple rapid clicks can each spawn their own independent overlapping ripple rather than one ripple restarting and cutting off the last click's animation.
- Animate each ripple's scale from 0 to 1 and opacity from ~0.6 to 0 via Framer Motion, ~0.7s easeOut, wrapped in AnimatePresence so removal (via a setTimeout matching the animation duration, which prunes the ripple from state after it's done) can exit-animate instead of vanishing abruptly.
- The button needs `overflow-hidden` and `position: relative` so ripples clip to its rounded shape instead of spilling outside it.
- Props: label, color ("light" ripple on a dark button or "dark" ripple on a light button).

Style: solid brand-colored button, rounded corners, white or black translucent ripple depending on the color prop.

Output a single self-contained "use client" component.
````
