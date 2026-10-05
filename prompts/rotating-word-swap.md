# Rotating Word Swap Headline: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Rotating Word Swap Headline** from scratch, or edit it first to restyle it. The finished code is [components/rotating-word-swap.tsx](../components/rotating-word-swap.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/rotating-word-swap?ref=github).

````text
Create a React + Tailwind + Framer Motion "rotating word swap" headline component named RotatingWordSwap.

Behavior:
- A sentence fragment (e.g. "Make it") followed by a single word that automatically cycles through a list on a timer, each swap sliding the outgoing word up and out while the incoming word slides up and in from below — a vertical "odometer" style swap, not a fade or instant cut.
- Cycle the active word index with setInterval inside a useEffect (cleaned up on unmount / dependency change), advancing modulo the words array length.
- Wrap the animated word in Framer Motion's AnimatePresence with mode="popLayout" so the exiting word doesn't affect layout while it's still animating away, keyed by the word text itself so React treats each word as a distinct element to animate in/out.
- CRITICAL layout detail: the animated word must be absolutely positioned inside a relatively-positioned wrapper, and that wrapper's actual box width/height must come from a SEPARATE invisible sibling span containing the widest word in the list (className "invisible", normal document flow, not absolutely positioned) — sized once via that invisible content, with overflow-hidden clipping the sliding animation. If the animated word is just an inline sibling next to the invisible spacer instead of stacked on top of it via absolute positioning, they'll sit side by side instead of overlapping, breaking the layout.
- Props: prefix (leading text), words (array of words to cycle through), interval (ms between swaps).

Style: bold display headline, cycling word in an accent color, smooth ~400ms cubic-bezier slide.

Output a single self-contained "use client" component.
````
