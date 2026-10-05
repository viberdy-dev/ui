# Weight Wave Text: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Weight Wave Text** from scratch, or edit it first to restyle it. The finished code is [components/weight-wave-text.tsx](../components/weight-wave-text.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/weight-wave-text?ref=github).

````text
Create a React + Tailwind component named WeightWaveText — a headline whose per-character font weight swells around the pointer.

Behavior:
- Split the text into one span per character.
- When the pointer is over the headline, each character's weight is a function of its horizontal distance from the pointer: intensity = max(0, 1 - distance / reach) ** 2, then weight = minWeight + (maxWeight - minWeight) * intensity. The squared falloff gives the swell a soft shoulder.
- When the pointer leaves, fall back to an idle travelling sine wave: intensity = ((sin(t - i * 0.45) + 1) / 2) * 0.55, advancing t each frame — so the headline is alive before anyone touches it.
- Apply weight via style.fontVariationSettings = '"wght" N'.

Critical requirements:
- This REQUIRES a variable font with a weight axis (Geist, Inter var, Roboto Flex). With a static two-weight family it will step between weights and look broken.
- Write the weight DIRECTLY to each element from a requestAnimationFrame loop via refs. Do NOT use React state — a setState per frame across a dozen characters re-renders the whole headline ~60 times a second.
- Keep the pointer position in a ref, not state.
- In pointer mode, read every character's getBoundingClientRect first, then write every weight. Interleaving a read after each write forces a layout per character, per frame.
- Only run the loop while there is something to animate: pause it with an IntersectionObserver while the headline is off-screen, and let it sleep when the pointer is away and the idle wave is off. The pointer handlers wake it again.
- Cancel the animation frame and disconnect the observer on unmount.

Accessibility:
- Per-character splitting destroys text selection and can make screen readers announce letter by letter. Render ONE sr-only copy of the string and mark the split version aria-hidden.
- Respect prefers-reduced-motion (and react to it changing): no idle wave, letters rest at minWeight, and only the pointer swell remains, since the reader controls it.

Props: text (string), minWeight (number), maxWeight (number), reach (px).

Output a single self-contained "use client" component.
````
