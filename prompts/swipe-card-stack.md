# Swipe Card Stack: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Swipe Card Stack** from scratch, or edit it first to restyle it. The finished code is [components/swipe-card-stack.tsx](../components/swipe-card-stack.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/swipe-card-stack?ref=github).

````text
Create a React + Framer Motion "swipe card stack" pattern named SwipeCardStack.

Behavior:
- Renders a small stack of overlapping cards (array in state), each offset in scale and y-translate by its depth in the stack (deeper cards are slightly smaller and pushed down, like a real physical stack).
- Only the top card is draggable (drag="x", dragConstraints locked to {left:0, right:0} so it snaps back on the y-axis, dragElastic for a rubbery feel).
- On drag end, if the horizontal offset (info.offset.x) exceeds a threshold, move that card to the back of the array (state update) — simulating "swiped away, next card up"; otherwise it springs back to center automatically because dragConstraints resets it.
- whileDrag applies a slight rotation for physicality.
- Spring transition (stiffness 300, damping 24) for the settle animation.

Style: rounded-2xl cards with soft shadow and border, centered bold label. Feels tactile and game-like — like a Tinder deck or a flashcard stack, not a static carousel.

Output a single self-contained "use client" component using useState + framer-motion drag props only (no external swipe/gesture libraries beyond framer-motion).
````
