# Page Loading Bar: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Page Loading Bar** from scratch, or edit it first to restyle it. The finished code is [components/page-loading-bar.tsx](../components/page-loading-bar.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/page-loading-bar?ref=github).

````text
Create a React + Tailwind + Framer Motion "top-of-page loading bar" (nprogress-style) pattern: a `usePageLoadingBar` hook plus a `PageLoadingBar` display component.

Behavior:
- The hook exposes { progress, loading, start, finish }. Calling `start()` sets loading true and progress to a small initial value (e.g. 3%).
- While loading, a requestAnimationFrame loop advances progress toward ~90% with an EASING approach — each frame moves progress a fraction of the remaining distance to 90 (e.g. `p + (90 - p) * 0.03`), which decelerates asymptotically and never actually reaches 90 on its own. This is the standard trick for indeterminate-duration loading bars: it always looks like it's still making progress without ever appearing finished or stuck.
- Calling `finish()` cancels the RAF loop, snaps progress to 100, then after a brief pause (~300ms, enough to see the bar completing) resets loading to false and progress to 0.
- The display component is a fixed, full-width, very thin bar pinned to the very top of the viewport, whose width and opacity are driven by the progress/loading values from the hook.
- Wire `start()` to fire on route-change-start (e.g. a Next.js router event or a manual navigation trigger) and `finish()` when the new page has rendered.

Style: a thin (2-4px) full-width bar in a bold accent color, fixed to the very top edge, no border-radius needed at that thinness.

Output self-contained "use client" code (hook + component).
````
