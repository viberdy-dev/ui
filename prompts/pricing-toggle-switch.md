# Pricing Toggle Switch: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Pricing Toggle Switch** from scratch, or edit it first to restyle it. The finished code is [components/pricing-toggle-switch.tsx](../components/pricing-toggle-switch.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/pricing-toggle-switch?ref=github).

````text
Create a React + Tailwind + Framer Motion "pricing billing toggle" component named PricingToggleSwitch.

Behavior:
- A Monthly/Yearly boolean toggle switch (a real track+thumb switch, not a checkbox) between two labels. IMPORTANT switch implementation detail: the thumb span needs an explicit `left-0.5` base position class — if you omit `left` entirely and only apply a translate-x utility when active, the thumb's CSS "static position" is computed from normal document flow, which is NOT guaranteed to be 0 in a track with padding/sizing, and the translate can push it visibly outside the track. Always give the thumb an explicit resting `left`.
- Yearly shows a small "Save N%" badge computed from comparing yearlyPrice to monthlyPrice * 12.
- The price display swaps between the monthly and yearly numbers via Framer Motion's AnimatePresence (mode="popLayout"), sliding vertically (y: 20 -> 0 on enter, y: -20 on exit) rather than an instant re-render — same "digit swap" feel as an odometer/counter badge, keyed on the billing period so React treats it as a real element swap.
- Props: monthlyPrice, yearlyPrice, currency.

Style: a clean centered pricing card, big black display-weight price, small muted "/mo" or "/yr" suffix, red accent for the toggle and the save badge.

Output a single self-contained "use client" component.
````
