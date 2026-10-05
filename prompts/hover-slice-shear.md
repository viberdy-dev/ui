# Slice Shear Hover: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Slice Shear Hover** from scratch, or edit it first to restyle it. The finished code is [components/hover-slice-shear.tsx](../components/hover-slice-shear.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/hover-slice-shear?ref=github).

````text
Create a React + Tailwind component named HoverSliceShear — oversized display text that cuts into horizontal bands and shears apart on hover.

Behavior:
- Render the text N times (slices prop, default 6). Clip each copy to its own horizontal band with clip-path: inset(top% 0% bottom% 0%), where top = i/slices*100 and bottom = 100 - (i+1)/slices*100.
- On hover, translate each band horizontally. Alternate the direction per band (even bands right, odd bands left).
- Scale each band's offset by a falloff of 1 - abs(i - (slices-1)/2) / slices so bands near the vertical centre move most and the edges move least — this makes it fan rather than comb.
- Stagger the transition-delay by about 18ms per band.
- Use a 500ms transition with cubic-bezier(0.16, 1, 0.3, 1).

Accessibility requirement (important):
- The visible stack is duplicated text, so wrap it in aria-hidden and render exactly ONE screen-reader copy of the string in an sr-only span. Never let N copies of the word reach the accessibility tree.
- Include one invisible (not hidden) copy in normal flow to establish the box, so the absolutely-positioned bands size themselves and no fixed height is needed.

Props: text (string), slices (number), shear (number, px).

Output a single self-contained "use client" component.
````
