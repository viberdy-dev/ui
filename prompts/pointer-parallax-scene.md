# Pointer Parallax Scene: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Pointer Parallax Scene** from scratch, or edit it first to restyle it. The finished code is [components/pointer-parallax-scene.tsx](../components/pointer-parallax-scene.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/pointer-parallax-scene?ref=github).

````text
Create a React + Tailwind + Framer Motion parallax system: PointerParallaxScene (the container) plus ParallaxLayer (a child).

Behavior:
- The container tracks the pointer and normalises its position to -0.5..0.5 on each axis, stored in TWO motion values and smoothed with springs (damping 22, mass 0.6, configurable stiffness). On mouse leave both return to 0.
- Each ParallaxLayer takes a `depth` prop and translates by (pointer * depth * 2). Negative depth sits behind, positive in front, 0 is pinned to the screen plane.
- The container sets perspective so a tilted child reads as 3D.

Architecture requirements:
- There must be exactly ONE pointer source shared by all layers via context — not per-layer mouse tracking. Parallax is that single value multiplied by each layer's depth.
- ParallaxLayer must be its own component, not a callback inside a .map(), because useTransform has to be called at a component's top level. Calling hooks inside a map callback is a rules-of-hooks violation the moment the layer list is dynamic.
- Pointer position rides motion values, NEVER React state — layers must update without re-rendering the scene.

Props: PointerParallaxScene { children, stiffness }. ParallaxLayer { depth, className, children }.

Output self-contained "use client" components (remember to import createContext/useContext).

Output a single self-contained "use client" module.
````
