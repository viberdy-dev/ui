# Searchable FAQ Accordion: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Searchable FAQ Accordion** from scratch, or edit it first to restyle it. The finished code is [components/searchable-faq-accordion.tsx](../components/searchable-faq-accordion.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/searchable-faq-accordion?ref=github).

````text
Create a React + Tailwind + Framer Motion "searchable FAQ accordion" component named SearchableFaqAccordion.

Behavior:
- A search input filters a list of {q, a} FAQ entries by substring match against both question and answer, recomputed with useMemo.
- Each remaining FAQ is independently expandable/collapsible. Track open state as a Set of STABLE ids (the item's original index in the full unfiltered list, attached before filtering), not the item's position in the currently-filtered array — if you track open state by filtered-array position, typing into the search box (which changes what's at each position) would open/close the wrong items or lose track of what was actually open.
- Expand/collapse animates height + opacity via AnimatePresence, chevron rotates 180deg when open.
- Props: faqs (array of {q, a}).

Style: pill search input with icon, divided list of question rows, muted answer text revealed beneath.

Output a single self-contained "use client" component.
````
