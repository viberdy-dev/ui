# Scramble Text: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Scramble Text** from scratch, or edit it first to restyle it. The finished code is [components/scramble-text.tsx](../components/scramble-text.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/scramble-text?ref=github).

````text
Create a React "scramble text" hover effect component named ScrambleText.

Behavior:
- On hover (or on mount, configurable), the text runs a decode animation: each character position resolves from random characters into its final real character progressively left-to-right, like a hacker-movie decryption effect.
- Implementation: keep an "iteration" counter (fractional, so each letter scrambles a few times before it locks); on each tick of a setTimeout loop running every speed milliseconds, for every character index less than the current iteration show the real character, otherwise show a random character from a charset (letters + symbols); increment iteration by 1/3 each tick until it reaches text.length, then stop.
- Use a timer, not requestAnimationFrame: the tick rate is the effect, and rAF would make it run faster on high-refresh displays.
- Preserve spaces as spaces (don't scramble whitespace).
- Clear any pending timer if triggered again before finishing (restart from the first character), and on unmount.
- Props: text (the real string), speed (ms between ticks, default 30), trigger ("hover" | "mount", default "hover").

Style: monospace bold text so character width stays stable during the scramble (no layout jitter).

Output a single self-contained "use client" component using useState, useRef, useCallback, useEffect and setTimeout only — no external scramble/decode libraries.
````
