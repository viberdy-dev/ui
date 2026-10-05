# Draggable Bottom Sheet Modal: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Draggable Bottom Sheet Modal** from scratch, or edit it first to restyle it. The finished code is [components/draggable-bottom-sheet.tsx](../components/draggable-bottom-sheet.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/draggable-bottom-sheet?ref=github).

````text
Create a React + Tailwind + Framer Motion "draggable bottom sheet" modal component named BottomSheet.

Behavior:
- A modal sheet that slides up from the bottom of the screen when opened (controlled via an `open` boolean prop) with a dimming scrim behind it, and can be dismissed three ways: clicking the scrim, dragging the sheet down past a distance/velocity threshold, or the consuming app calling onClose directly.
- Wrap both the scrim and the sheet in AnimatePresence so they animate out (not just disappear) when `open` becomes false — scrim fades opacity, sheet slides back down via a y translate to "100%".
- The sheet itself needs Framer's drag="y" (vertical-only dragging), dragConstraints={{ top: 0, bottom: 0 }} (so it can't be dragged permanently away from its resting position — it should snap back unless actually dismissed), and dragElastic={{ top: 0, bottom: 0.5 }} (rubber-band resistance when dragging down, no give when dragging up past rest).
- In onDragEnd, check BOTH how far it was dragged (info.offset.y past some threshold like 80px) AND how fast it was flung (info.velocity.y past some threshold like 500) — either condition alone should trigger dismissal (a fast short flick should dismiss even if the total distance is small, and a slow long drag should too even if released gently). If neither threshold is cleared, Framer's own spring return (from the drag constraints) snaps it back to resting position automatically — no manual "reset" animation needed.
- A small drag-handle bar (a short rounded rect) at the top of the sheet signals it's draggable.
- Props: open (boolean), onClose (callback), title, children (sheet body content).

Style: rounded top corners on the sheet, dark semi-transparent scrim, spring-based open/close (not linear).

Output a single self-contained "use client" component.
````
