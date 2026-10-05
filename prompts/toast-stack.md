# Toast Notification Stack: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Toast Notification Stack** from scratch, or edit it first to restyle it. The finished code is [components/toast-stack.tsx](../components/toast-stack.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/toast-stack?ref=github).

````text
Create a React + Framer Motion "toast notification stack" pattern — a useToasts hook + ToastStack renderer.

Behavior:
- A useToasts(duration) hook holds a toasts array in state, each with a unique id (a module-level incrementing counter, not Date.now()/Math.random(), so ids are stable and collision-free) and a message.
- pushToast(message) appends a new toast and schedules its own removal via setTimeout(duration) that filters it back out by id — so each toast manages its own lifetime independently of the others (a later toast doesn't reset an earlier one's timer).
- The returned ToastStack component renders the current toasts in a fixed-position, pointer-events-none column, using AnimatePresence + motion.div with the "layout" prop so existing toasts smoothly reflow (slide) when one above/below them is removed, rather than snapping to a new position.
- Each toast animates in from a slight vertical offset + scale with a spring, and animates out by fading + scaling down (exit).
- Multiple toasts can be visible simultaneously, stacked vertically, most recent last (or first, depending on desired order).

Style: pill-shaped dark toast bubbles with a small colored status dot, small semibold text, drop shadow. Feels like a real product's save/copy confirmation toast, not an alert() replacement.

Output a self-contained "use client" hook + component pair using useState + AnimatePresence + motion.div's layout prop (no external toast library).
````
