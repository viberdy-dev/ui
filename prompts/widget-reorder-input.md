# Widget Reorder Input: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Widget Reorder Input** from scratch, or edit it first to restyle it. The finished code is [components/widget-reorder-input.tsx](../components/widget-reorder-input.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/widget-reorder-input?ref=github).

````text
Create a React + Tailwind v4 client component, WidgetReorderInput: a "customise your dashboard" panel in a dark bento kit's utility register, with drag and full keyboard reorder, show and hide switches, a live miniature of the result, and save, cancel and reset.

Types: DashWidget = { id, name, size: "1x1" | "2x1" | "1x2" | "2x2", visible }. Props: title (default "Customise dashboard"), widgets (the saved layout, in order), defaults? (what Reset returns to; default widgets), onSave?(widgets) (resolve when stored, throw to show the error), accent ("#rrggbb", regex-validated, default #ff5a1f), className.

Kit tokens: the panel is a tile, #0f1012 with an inset 1px hairline at white 0.08, radius 20, and a Tailwind `@container`; rows #131417; raised #1b1c20 with a 0.22 hairline for a row being moved; mono 11px uppercase +0.12em labels in var(--font-mono, var(--font-geist-mono, ui-monospace, …)); controls radius 10; the Save button is the only accent (text dark or white by luminance) and turns grey when there is nothing to save; no shadows.

State: saved, draft, grabbed ({ id, from } | null), dragging (id | null), an announcement string and a save state (idle, busy, done for 1.4s, error). The header shows the title, one line of help, and a mono count of changes or "Saved": rows moved (all rows minus the longest run still in saved order, so one drag counts once) plus rows whose visibility differs. A sr-only instructions paragraph and a sr-only aria-live="polite" role="status" line that announces every pick-up, move, drop, cancel, show, hide, save and reset.

The list, on shared hairlines: an isolated wrapper with a white 0.08 layer behind (z −1, radius 14) and a <ul role="list"> with 1px margin, gap 1px, radius 13, overflow hidden; each <li> is 48px (data-flip={id}): a grip button (40px wide, a six-dot SVG, aria-label "Move {name}", aria-describedby the instructions, aria-pressed while picked up, touch-action none, grab and grabbing cursors), the name (white, or 40% when hidden, truncated), the size in mono, and a role="switch" (aria-checked, aria-label "Show {name}", a 36x20 track, white 90% with a #0f1012 knob when on, #26272b with a 60% white knob when off, the knob sliding 16px over 200ms).

Keyboard on the grip: Space or Enter picks up and drops; ArrowUp/ArrowDown move a picked-up row (Alt with an arrow moves any row in one step); Escape returns it to where it was picked up; blurring a picked-up row drops it. After a keyboard move, refocus the grip in a layout effect keyed on the order (React may have moved the node), and ignore the blur that move causes.

Pointer: pointerdown on the grip records the pointer y in list layout pixels (rect scaled by offsetHeight / rect height), the grab offset within the row and the row pitch (second row's offsetTop minus the first's); capture the pointer in try/catch. After 6px of travel, dragging starts; each move sets the target index to round((y − grab) / pitch), clamped, reorders the draft when it changes, and translates the row by y − grab − its offsetTop (a layout effect re-applies this after each reorder). On pointerup or cancel, the row settles from its transform to none (320ms on the same spring) and the drop is announced.

FLIP: a hook that, in a layout effect keyed on the order string (ids plus a visibility mark), records every [data-flip] child's offsetLeft/offsetTop and animates the ones that moved from their old place (translate, 380ms on the kit's reorder spring, cubic-bezier(0.34,1.25,0.64,1)); new children scale in from 0.92 with a fade; skip the dragged row and everything under reduced motion; finish running animations in cleanup. It runs on the list and on the miniature.

The miniature (aria-hidden, #08090a with a 0.06 hairline, radius 14, a mono "Preview" label): a 4-column grid with 56px rows, gap 6, dense, holding the visible widgets as #16171a tiles (radius 10, spans from their size, the name in 10px mono), the moving one outlined at white 0.4. At @3xl the list and the miniature sit side by side (1.15fr and 1fr).

Footer, above a 1px hairline: "Reset to defaults" (a text button), then Cancel (a hairline button; disabled when clean or while saving; restores the draft to saved) and Save (disabled when clean or busy; "Saving…", then "Saved"; on error a red "Not saved. Try again."). Reset is disabled while saving too. Each save takes a run number and saves the draft it started with; when it resolves, it only writes saved and announces if no newer run has started.

Output one self-contained "use client" TSX file with no dependencies beyond React; export the DashWidget type. Build strings with + rather than template literals.
````
