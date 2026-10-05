# Pushed Shadow Button: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Pushed Shadow Button** from scratch, or edit it first to restyle it. The finished code is [components/pushed-shadow-button.tsx](../components/pushed-shadow-button.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/pushed-shadow-button?ref=github).

````text
Create a React + Tailwind component, PushedShadowButton: a neo-brutalist button that behaves like a physical object sitting on its own hard shadow.

Props (export PushedShadowButtonProps): children (default "Start building"), href? (renders a link; sanitise: strip tabs and newlines, refuse backslashes, allow http(s), mailto, tel and paths starting / # ? but not //), color (a kit fill "yellow" #ffd23f | "coral" #ff6b6b | "blue" #74b9ff | "lime" #b4f462 | "pink" #ff5fa2 | "white" | "cream" #fffdf5 | "black", or any #rrggbb, regex-validated; look named fills up by own key only), ink (#rrggbb, default #000000: the border, the shadow and the label on light fills), size ("sm" 40px tall, 14px text | "md" 48px, 16px | "lg" 64px, 20px), arrow (boolean), caps (uppercase at +0.04em), block (full width), busy (+ busyLabel, default "Working"), type, disabled, onClick, className.

The physics: a 3px solid border in the ink (set inline so no global border-colour rule can repaint it), square corners, and a hard shadow 5px 5px 0 0 in the ink with no blur. The shadow's far corner never moves: on hover the button translates -2px,-2px while the shadow grows to 7px; while pressed it translates 5px,5px and the shadow goes to none, so it lands exactly on the shadow. Transition only transform, translate and box-shadow (Tailwind v4 translate utilities set the translate property), 100ms linear, no easing and no scale; none under prefers-reduced-motion. Drive the press from state rather than :active so it shows for every input: pointer down (primary button) presses, pointer up, leave and cancel release; Enter (and Space on buttons, never on links) presses on keydown when not a repeat and releases on keyup and blur.

Type: var(--font-display, "Archivo", "Archivo Black", "Arial Black", "Helvetica Neue", Arial, sans-serif) at weight 800, leading 1, tracking -0.005em. The label reads in the ink on light fills and in cream #fffdf5 on dark fills (compute relative luminance; below 0.3 counts as dark, and flip to black if the ink itself is light). The arrow is an 18x14 SVG whose stroke is 3px with square caps and a miter join, so it matches the border; it steps 3px right on hover over the same 100ms.

Focus-visible: a 3px dashed outline in the ink, 4px outside. Disabled: no shadow, no movement, a hatched fill (a repeating 135deg gradient of the ink at 15% alpha, 3px lines every 9px) over the colour, 72% opacity, not-allowed cursor. Busy: the button keeps its resting shadow but neither lifts nor presses, the label goes transparent (keeping the width), three 9px ink squares step on one after another (a 900ms keyframe with steps, 300ms apart) inside a role="status" element labelled by busyLabel, aria-busy and aria-disabled are set, and clicks are prevented.

Write the focus-ring declarations as important utilities (for example focus-visible:![outline-style:dashed], focus-visible:![outline-offset:4px], focus-visible:![border-radius:0]) and keep the ring colour inline, so an unlayered global :focus-visible rule in the host app cannot replace them.

Output one self-contained "use client" TSX file with no dependencies beyond React. Build strings with + rather than template literals.
````
