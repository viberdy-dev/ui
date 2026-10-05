# Velocity Marquee Rail: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Velocity Marquee Rail** from scratch, or edit it first to restyle it. The finished code is [components/velocity-marquee-rail.tsx](../components/velocity-marquee-rail.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/velocity-marquee-rail?ref=github).

````text
Create a React + Tailwind + Framer Motion component named VelocityMarqueeRail — a marquee whose speed and direction are driven by scroll.

Behavior:
- The rail drifts at a slow base speed when the page is still.
- Scrolling accelerates it; scrolling the other way REVERSES its direction.
- The loop is seamless.

Implementation requirements (each of these is load-bearing):
- Get velocity with useVelocity(scrollY) and smooth it with useSpring (damping 50, stiffness 400). Raw scroll velocity is far too spiky to use directly as an animation input.
- Map velocity to a multiplier with useTransform(..., [0, 1000], [0, boost], { clamp: true }). WITHOUT the clamp, a fast flick sends the rail off at an unreadable speed.
- Advance the position manually inside useAnimationFrame by mutating a motion value — do NOT use a CSS animation. Manual advancement is the only way to reverse direction mid-flight without a visible restart.
- Scale movement by (delta / 1000) * 60 so the speed is identical on 60Hz and 120Hz displays.
- Repeat the content 4 times and wrap the offset with Framer's wrap(-25, 0, v) helper — one tile is 25% of the track, so this loops seamlessly AND keeps the offset bounded instead of growing without limit.

Accessibility:
- The content is repeated 4x for the loop. Mark every duplicate tile aria-hidden so the text is announced once.

Props: words (string[]), baseSpeed (number), velocityBoost (number).

Output a single self-contained "use client" component.
````
