# Morphing Hamburger Icon: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Morphing Hamburger Icon** from scratch, or edit it first to restyle it. The finished code is [components/morphing-hamburger-icon.tsx](../components/morphing-hamburger-icon.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/morphing-hamburger-icon?ref=github).

````text
Create a React + Tailwind + Framer Motion "morphing hamburger icon" button named MorphingMenuButton.

Behavior:
- A button containing three horizontal bars (top, middle, bottom) stacked with even spacing, that morph into an X shape when toggled open, and back into three lines when toggled closed.
- Track open/closed as boolean state, toggled on click.
- Each bar is its own absolutely-positioned motion.span (not an SVG path) animated independently via Framer's animate prop with two variants:
  - Top bar: rotate 45deg and translate down (via y) to meet the vertical center when open; rotate 0 / y 0 when closed.
  - Middle bar: fade out (opacity 0) and slide slightly when open; fully visible when closed.
  - Bottom bar: mirror of the top bar — rotate -45deg and translate up to meet the center when open.
- The rotate + translate combination is what makes the top and bottom bars visually meet and form a clean X at the center rather than an X with a gap or overlap — the y offset must roughly equal half the icon's height times its shrink factor.
- Props: size (icon size in px).

Style: rounded pill button container, thin rounded-full bars, smooth ~300ms easing.

Output a single self-contained "use client" component.
````
