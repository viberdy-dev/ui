# Animated Gradient Border Beam: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Animated Gradient Border Beam** from scratch, or edit it first to restyle it. The finished code is [components/gradient-border-beam.tsx](../components/gradient-border-beam.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/gradient-border-beam?ref=github).

````text
Create a React + Tailwind "animated border beam" card component named BorderBeamCard.

Behavior:
- A card with a thin (~2px) border where a bright light beam continuously travels around the perimeter, like a comet chasing the edge.
- Technique: the outer wrapper is `relative overflow-hidden rounded-2xl` with a small padding (p-[2px]) reserving the border thickness. Behind the actual card content, place an absolutely-positioned oversized square (inset roughly -50% so it's ~2x the container in both dimensions — big enough that its corners always cover the container regardless of rotation) with a `conic-gradient` background: mostly transparent, with a short bright arc (e.g. transparent 0% -> accent-color 8% -> transparent 18%). Spin that square continuously with a CSS `transform: rotate` keyframe animation.
- The actual card content sits in a second, normal (non-oversized) layer on top with its own background, inset by the padding — so only the thin p-[2px] ring around it shows the spinning gradient underneath, reading as a beam traveling the border. The outer `overflow-hidden` clips the oversized spinning square to the card's rounded rect.
- IMPORTANT: thread the per-instance `speed` prop through the element's own inline `style` as a CSS custom property (e.g. --beam-speed), and reference it via var() inside a fully static <style jsx> block — do NOT interpolate ${speed} directly inside the <style jsx> template literal itself, some bundler setups compile that to a broken/frozen animation duration.
- Props: label (card text), speed (seconds per full rotation).

Style: dark card background, single accent-colored beam arc, smooth continuous linear rotation (no easing pauses).

Output a single self-contained component (no "use client" strictly required, but include it since it uses <style jsx>).
````
