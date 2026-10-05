# Path Follow Scroll: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Path Follow Scroll** from scratch, or edit it first to restyle it. The finished code is [components/path-follow-scroll.tsx](../components/path-follow-scroll.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/path-follow-scroll?ref=github).

````text
Create a React + Tailwind + Framer Motion component named PathFollowScroll — a marker that travels along an SVG path as the user scrolls, with the path drawing in behind it.

Behavior:
- A tall section (~200vh) with a sticky SVG. Scrolling moves a marker from the start of the path to the end while an accent stroke draws in behind it.
- Progress comes from useScroll({ target, offset: ["start end", "end start"] }) and is smoothed with useSpring (stiffness 220, damping 40).

Two implementation requirements that are the point of the component:
1. Move the marker with CSS offset-path / offset-distance — set offsetPath to path("<d>") and drive offsetDistance from 0% to 100%. Do NOT interpolate x/y manually. The browser solves both the position and the TANGENT ANGLE along the curve, so offsetRotate: "auto" banks the marker through the bends for free; doing that by hand means sampling the path and differentiating it.
2. Draw the trail with stroke-dasharray/stroke-dashoffset and set pathLength={1} on the path so the dash values are plain 0-1 fractions. No getTotalLength() call, and it keeps working at any rendered size.

Also: hoist every useTransform to the component's top level. Calling one inline inside conditionally-rendered JSX makes a hook run conditionally, which breaks the rules of hooks.

Props: d (SVG path string), viewBox (string), markerSize (number).

Output a single self-contained "use client" component.
````
