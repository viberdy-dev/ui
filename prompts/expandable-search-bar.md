# Expandable Search Bar: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Expandable Search Bar** from scratch, or edit it first to restyle it. The finished code is [components/expandable-search-bar.tsx](../components/expandable-search-bar.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/expandable-search-bar?ref=github).

````text
Create a React + Tailwind + Framer Motion "expandable search bar" component named ExpandableSearchBar.

Behavior:
- Starts as a small circular icon-only button (just a search icon). On click, it smoothly expands horizontally into a full-width pill containing a search icon, a real focused text input, and a close (X) button.
- Use Framer Motion's automatic `layout` prop on the pill's outer wrapper (not manual width keyframes) combined with a spring transition, and drive the actual target width via the wrapper's own inline style (a fixed small px value when closed, a larger px value when open) — layout handles animating between those two states smoothly.
- When opening, focus the real <input> element via a ref, deferred with requestAnimationFrame so it runs after the state update that renders the input has committed (focusing before the input exists in the DOM is a no-op).
- Clicking the close (X) button collapses back to the icon-only state.
- Props: placeholder (input placeholder text), width (expanded width in px).

Style: pill-shaped container, icon-only collapsed state perfectly circular, smooth spring expand/collapse (not linear).

Output a single self-contained "use client" component.
````
