# Weight Slam Text: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Weight Slam Text** from scratch, or edit it first to restyle it. The finished code is [components/weight-slam-text.tsx](../components/weight-slam-text.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/weight-slam-text?ref=github).

````text
Create a React + Tailwind text effect, WeightSlamText: neo-brutalist display type whose weight slams instead of easing. Each letter jumps from its rest weight to heavy in two hard steps inside 80ms (transition font-weight 80ms steps(2, end)), like a press coming down, and lets go in three slower steps (180ms steps(3, end)). No smooth interpolation anywhere.

Props (export WeightSlamTextProps): text (default "Build loud.\nShip daily."; "\n" starts a new line), as ("h1" | "h2" | "h3" | "p", allowlisted at run time), mode ("sweep" default | "press" | "view"), rest (100-700, default 400), peak (500-1000, default 900), reach (0-3 neighbours a press thickens, default 1), stretch (slammed letters also widen up to font-stretch 112%, for fonts with a width axis like Archivo), caps, color (#rrggbb, regex-validated), className (sets the size, e.g. text-[clamp(52px,12.5cqw,168px)]). Clamp every number and fall back on NaN.

Modes:
- "sweep": pointer enter (not touch), or focus entering the text (a link or button inside it), sets every letter to the peak with a transition delay of index x 45ms, so they come down left to right like a row of stamps; pointer leave or blur releases them with delays of (count - 1 - index) x 30ms, right to left.
- "press": on pointer move (not touch), the letter under the pointer goes to the peak and each neighbour within reach part-way (rest + (peak - rest) x (reach + 1 - distance) / (reach + 2)). Judge which letter is under the pointer against an invisible copy of the text set at the rest weight (absolutely positioned over the visible one, aria-hidden, pointer-events none), using each ghost letter's offset centre, with vertical distance counted double so the strike stays on the pointer's line, and map the pointer into layout pixels (divide by rect width over offsetWidth, for transform-scaled previews). That way the visible line can reflow as letters thicken without the strike jittering. On screens with (hover: none) it plays the sweep once when 60% of it is on screen (IntersectionObserver, read the last entry's intersectionRatio).
- "view": slams left to right once when 60% is on screen, and stays.

Render each line as a nowrap block of inline-block letter spans (spaces as a non-breaking space, built with String.fromCharCode(160)), aria-hidden, with a visually hidden copy of the whole text for screen readers (no aria-label, which a paragraph cannot carry). Type: var(--font-display, "Archivo", "Archivo Black", "Arial Black", "Helvetica Neue", Arial, sans-serif), leading 0.9, tracking -0.02em, uppercase by default, select-none. Under prefers-reduced-motion drop the transitions so the weight simply changes.

Output one self-contained "use client" TSX file with no dependencies beyond React. Build strings with + rather than template literals.
````
