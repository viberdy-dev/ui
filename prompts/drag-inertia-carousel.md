# Drag Inertia Carousel: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Drag Inertia Carousel** from scratch, or edit it first to restyle it. The finished code is [components/drag-inertia-carousel.tsx](../components/drag-inertia-carousel.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/drag-inertia-carousel?ref=github).

````text
Create a React + Tailwind + Framer Motion component named DragInertiaCarousel — a draggable rail that you can throw and that settles on the nearest slide.

Behavior:
- A horizontal rail of fixed-width slides, draggable on the x axis with dragConstraints limiting it to the slide range and a small dragElastic for rubber-banding at the ends.
- On release, the rail settles on a slide with a spring (stiffness configurable, damping 32, mass 0.8).
- Dot indicators below; clicking one jumps to that slide.

The two decisions that make it feel right (do not skip either):
1. Set dragMomentum={false}. You are resolving the throw yourself in onDragEnd — leaving Framer's momentum on as well makes the rail coast past the chosen slide and spring back, which is the classic "fighting the carousel" feel.
2. In onDragEnd, PROJECT where the throw would land using the gesture's velocity before rounding:
     const projected = info.offset.x + info.velocity.x * power;
     const next = Math.round(index - projected / slideWidth);
   then clamp to [0, slides.length - 1]. Snapping from info.offset alone ignores how hard the user threw it, so a hard flick and a gentle nudge covering the same distance behave identically — which is what feels wrong in most drag carousels.

Accessibility: dots are real buttons with aria-label and aria-current.

Props: slides (array of {id, label}), slideWidth (px, card + gap), power (velocity multiplier), stiffness (number).

Output a single self-contained "use client" component.
````
