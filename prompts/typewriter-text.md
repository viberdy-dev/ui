# Typewriter Text: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Typewriter Text** from scratch, or edit it first to restyle it. The finished code is [components/typewriter-text.tsx](../components/typewriter-text.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/typewriter-text?ref=github).

````text
Create a React "typewriter text" component named TypewriterText.

Behavior:
- Cycles through an array of phrases, typing each one out character by character, pausing, erasing it character by character, then moving to the next phrase and repeating (loops forever).
- State machine with three modes: "typing" (append one more character every `typeSpeed` ms), "pausing" (hold the fully-typed phrase for `pauseMs` ms), "erasing" (remove one character every `typeSpeed / 2` ms, erasing is faster than typing). When erasing empties the string, advance to the next phrase (wrapping around) and switch back to "typing".
- Drive the whole thing from a single useEffect keyed on [text, mode, phraseIndex, phrases, typeSpeed, pauseMs] that schedules exactly one setTimeout per render based on the current mode, always returning a cleanup that clears it — this is what makes the timing self-correcting without needing a separate interval/rAF loop.
- A blinking caret rendered as a plain absolutely-inline block after the text, blinking via a CSS animation (or animate-pulse), not a JS timer — the blink itself shouldn't need any state.
- Props: phrases (string array), typeSpeed (ms per character while typing), pauseMs (hold time on a fully-typed phrase).

Style: bold, large tracking-tight display text with a thin colored caret bar matching the text height.

Output a single self-contained "use client" component.
````
