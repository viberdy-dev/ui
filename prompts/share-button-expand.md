# Share Button Expand: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Share Button Expand** from scratch, or edit it first to restyle it. The finished code is [components/share-button-expand.tsx](../components/share-button-expand.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/share-button-expand?ref=github).

````text
Create a React + Tailwind + Framer Motion "expanding share button" component named ShareButtonExpand.

Behavior:
- A single icon-only share button that, when clicked, reveals a row of social/share option icons (X/Twitter, email, copy-link, etc.) beside it.
- Wrap the whole pill in a `motion.div` with the `layout` prop — that alone makes the pill's own width animate smoothly as the option buttons mount/unmount as children, rather than manually tweening a width value in sync with the children's enter/exit.
- Each option button uses AnimatePresence + a small scale/opacity enter with an index-based stagger delay.
- The "copy link" option writes `url` to the clipboard and shows a checkmark confirmation for ~1.4s instead of closing the menu; the other options close the menu on click (in a real implementation they'd also open a share intent URL).
- Props: url (the link to share).

Style: compact rounded pill, icon-only buttons, red accent on hover.

Output a single self-contained "use client" component.
````
