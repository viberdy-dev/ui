# Command Palette: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Command Palette** from scratch, or edit it first to restyle it. The finished code is [components/command-palette.tsx](../components/command-palette.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/command-palette?ref=github).

````text
Create a React + Tailwind + Framer Motion "command palette" (Cmd+K menu) component named CommandPalette.

Behavior:
- A trigger button (shows a search icon, label, and a "⌘K" kbd hint) opens a centered modal overlay: a dark backdrop (fixed inset-0, click to close) behind a floating panel (fixed, centered horizontally, positioned near the top of the viewport) containing a text input and a filtered, clickable list of commands below it.
- Filter the command list by substring match against the input value on every keystroke, recomputed with useMemo.
- Animate both the backdrop (opacity fade) and the panel (opacity + slight y/scale) in and out with Framer Motion's AnimatePresence, not a conditional render with no exit transition.
- Autofocus the input when the palette opens.
- Optionally wire a real `⌘K` / `Ctrl+K` global keydown listener (via useEffect) to open it, and Escape to close it, for the real shipped version.
- Props: items (the list of command strings), placeholder.

Style: clean, editorial, minimal — a floating white card with a bottom-bordered search row and a simple hover-highlighted list.

Output a single self-contained "use client" component.
````
