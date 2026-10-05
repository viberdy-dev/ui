# Scroll-Linked Image Mask Reveal: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Scroll-Linked Image Mask Reveal** from scratch, or edit it first to restyle it. The finished code is [components/scroll-linked-image-mask-reveal.tsx](../components/scroll-linked-image-mask-reveal.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/scroll-linked-image-mask-reveal?ref=github).

````text
Create a React + Tailwind + Framer Motion "scroll-linked circular mask reveal" component named ScrollLinkedImageMaskReveal.

Behavior:
- An image is masked by a circular clip-path whose radius is CONTINUOUSLY linked to scroll progress, not triggered once when it enters view. Use `useScroll({ target, offset: ["start end", "end start"] })` to get a 0-1 scrollYProgress motion value that tracks the target element's full pass through the viewport, then `useTransform` to map that to a clip-path circle radius percentage (e.g. 0% to 75%) and a slight scale-down (e.g. 1.3 to 1) for added depth.
- Apply the derived clip-path and scale as `style` on a `motion.img` (or a motion.div wrapping the image) — since these are motion values, not React state, they update every scroll frame without triggering component re-renders.
- The key distinction from a "reveal on scroll into view" component: this one tracks the CONTINUOUS scroll position bidirectionally — scrolling partway shows a partial reveal, and scrolling back up shrinks it again, rather than firing once and staying done.
- Props: src, alt.

Style: full-bleed image section, smooth continuous reveal tied 1:1 to scroll, no easing/animation duration involved since it's driven directly by scroll position.

Output a single self-contained "use client" component.
````
