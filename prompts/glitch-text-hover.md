# Glitch Text Hover: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Glitch Text Hover** from scratch, or edit it first to restyle it. The finished code is [components/glitch-text-hover.tsx](../components/glitch-text-hover.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/glitch-text-hover?ref=github).

````text
Create a React + Tailwind "RGB-split glitch text" hover effect component named GlitchText.

Behavior:
- On hover, the text splits into a red-tinted copy and a cyan-tinted copy, each offset from the real text and jittering rapidly, producing a classic VHS/CRT "glitch" look. On mouse-leave it returns instantly to normal (no transition needed on exit).
- Structure: a relatively-positioned wrapper with the group hover class. Inside it: (1) an absolutely-positioned red-colored duplicate of the text, clipped to only show its top half via clip-path: inset(0 0 55% 0), hidden by default and shown only on group-hover; (2) the real text, positioned normally on top; (3) an absolutely-positioned cyan-colored duplicate clipped to only show its BOTTOM half via clip-path: inset(55% 0 0 0), same hidden/group-hover visibility.
- Each duplicate layer has its own CSS keyframe animation (only running while visible on hover) that jitters its transform: translate between (0,0) and a small offset and back, using `steps()` timing (not smooth easing) so it reads as a jittery digital glitch rather than a smooth wobble. The two layers should offset in roughly opposite directions from each other.
- Thread the `intensity` prop (how many px the layers jitter) through the wrapper's own inline style as a CSS custom property, consumed via var() inside the keyframes — do not interpolate the prop value directly into a <style jsx> template literal, which can compile to a broken/frozen value in some bundler setups.
- Props: text, intensity (jitter distance in px).

Style: bold, large display text as the base; keep the effect subtle enough to read as "glitch," not so extreme the text becomes illegible.

Output a single self-contained component.
````
