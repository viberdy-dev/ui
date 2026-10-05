# Sticky Scroll Stack: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Sticky Scroll Stack** from scratch, or edit it first to restyle it. The finished code is [components/sticky-scroll-stack.tsx](../components/sticky-scroll-stack.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/sticky-scroll-stack?ref=github).

````text
Create a React + Tailwind + Framer Motion "sticky scroll stack" pattern named StickyScrollStack.

Behavior:
- A list of cards inside a scrollable container. As the user scrolls, each card becomes CSS `position: sticky` at an increasing top offset, so cards pile up and pin one on top of another rather than scrolling normally out of view.
- Each card scales down slightly once the NEXT card starts arriving, controlled by scroll progress from Framer's useScroll using its `container` option (NOT `target`) pointed at the scroll container's own ref — `container` tracks that element's own internal overflow scrollbar directly, whereas `target` tracks an ancestor page scrolling the element through the viewport and stays frozen at 0 when the element scrolls itself. Feed the resulting scrollYProgress into useTransform per card, mapping its own [start,end,end+buffer] progress window to a [1, 1, scaleDownAmount] output range.
- IMPORTANT: useTransform must be called from its own component instance per card (one hook call per component), never directly inside a .map() callback in the parent — extract a small per-card subcomponent that receives the shared scrollYProgress MotionValue as a prop and calls useTransform itself. Calling a hook a variable number of times inside one component's map callback breaks the rules of hooks even if the array length happens to be fixed.
- The scroll container needs real scrollable height — give the inner track height = cards.length * (per-card height), so there's enough scroll distance to see the stacking play out.
- Props: scaleStep (how much each buried card shrinks per card behind it).

Style: clean cards with a number badge, title, and short body text, subtle shadow so the stacking depth reads clearly.

Output a single self-contained "use client" module (main component + the per-card subcomponent).
````
