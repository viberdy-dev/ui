# Copy Code Snippet: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Copy Code Snippet** from scratch, or edit it first to restyle it. The finished code is [components/copy-code-snippet.tsx](../components/copy-code-snippet.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/copy-code-snippet?ref=github).

````text
Create a React + Tailwind "copyable code snippet" component named CopyCodeSnippet.

Behavior:
- A dark code block with a header row showing a small language tag pill and a copy button on the right.
- Clicking copy writes the raw `code` string to the clipboard via navigator.clipboard.writeText (wrapped so a rejected/unsupported clipboard call doesn't throw), then flips a `copied` boolean true, swapping the button's icon+label to a checkmark and "Copied" for about 1.6 seconds via setTimeout before reverting.
- The code itself renders in a <pre> with a monospace font, preserving whitespace/line breaks exactly as given.
- Props: code (the snippet text), language (label shown in the tag pill).

Style: dark terminal-like block, small muted header row, red accent on hover/copied state.

Output a single self-contained "use client" component.
````
