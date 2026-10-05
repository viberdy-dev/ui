# Draggable Range Slider: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Draggable Range Slider** from scratch, or edit it first to restyle it. The finished code is [components/range-slider.tsx](../components/range-slider.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/range-slider?ref=github).

````text
Create a React + Tailwind "draggable range slider" component named RangeSlider.

Behavior:
- A custom track (a thin rounded bar) and a circular thumb — NOT the native <input type="range"> — so it can be fully restyled, with a value bubble tooltip that only appears while actively dragging.
- Position is computed purely from state (a "value" number) mapped to a percent (0-100) via (value - min) / (max - min); the thumb and the filled portion of the track are both positioned from that same percent — one source of truth, so they never visually desync.
- Uses plain pointer events, not a drag library's built-in transform-based drag: on pointerdown (on the track, for click-to-jump, or the thumb, for grab-to-drag) start a "dragging" state; a useEffect that only runs while dragging is true attaches window-level pointermove/pointerup listeners (the "subscribe to an external system, setState in the callback" effect pattern), computing the new value from clientX relative to the track's bounding rect on every move, and tearing the listeners down (and clearing dragging) on pointerup or unmount.
- IMPORTANT: do not also drive the thumb through a drag/animation library's own internal transform state (e.g. Framer Motion's drag prop) while ALSO setting its position from computed state — the two position sources fight each other and desync/jump. Pick one: here, plain state + pointer events is simpler and fully controllable.
- Props: min, max, defaultValue.

Style: thin neutral track, red fill up to the thumb, a white circular thumb with a red ring border, dark rounded value-bubble tooltip above the thumb while dragging (monospace digits). Feels like a native product slider, not a raw <input type="range">.

Output a single self-contained "use client" component using useRef + useState + useEffect + native PointerEvent listeners only.
````
