# Animated Tabs Indicator: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Animated Tabs Indicator** from scratch, or edit it first to restyle it. The finished code is [components/animated-tabs-indicator.tsx](../components/animated-tabs-indicator.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/animated-tabs-indicator?ref=github).

````text
Create a React + Tailwind + Framer Motion "animated tabs with sliding indicator" component named AnimatedTabs.

Behavior:
- A row of tab buttons. Track the active tab index in state.
- A single highlight element (a colored pill/rounded rect) is rendered as a child ONLY inside the currently-active tab button, absolutely positioned to fill that button (`absolute inset-0`).
- Give that highlight element a Framer Motion `layoutId` (same string every time, e.g. "tab-indicator"). Because only one instance with that layoutId exists in the tree at once, and it moves to a different DOM parent (a different button) as `active` changes, Framer Motion automatically FLIP-animates it sliding from its old position/size to its new one — no manual position math needed, no measuring button offsets by hand.
- Use a spring transition (stiffness ~400, damping ~32) on the indicator for a snappy, slightly bouncy slide rather than a linear glide.
- Tab label text needs its own `relative` wrapper so it stacks above the absolutely-positioned indicator (which needs to render BEHIND the text, not on top of it — indicator first in JSX, or explicit z-index, either works since the indicator has no z-index set and text has position:relative giving it a stacking context above the static-positioned indicator... to be safe, give the indicator a lower z-index or the text an explicit `relative z-10`).
- Active tab's text color switches to a contrasting color (e.g. white) since it now sits on the filled indicator; inactive tabs stay muted with a hover state.
- Props: tabs (string array), shape ("pill" for fully rounded, "rounded" for a smaller radius).

Style: rounded pill-shaped tab bar container, brand-colored sliding indicator, white active label text.

Output a single self-contained "use client" component.
````
