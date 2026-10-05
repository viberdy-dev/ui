# Concrete Wall Texture: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Concrete Wall Texture** from scratch, or edit it first to restyle it. The finished code is [components/concrete-wall-texture.tsx](../components/concrete-wall-texture.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/concrete-wall-texture?ref=github).

````text
Build a procedural concrete/plaster surface in React + Tailwind named ConcreteWallTexture — a canvas overlay that sits over children and gives them a poured-concrete surface.

WHY CANVAS AND NOT AN IMAGE: a convincing concrete texture as a photograph is several hundred kilobytes and tiles visibly. Generated, it is a few milliseconds of work, seamless, resolution-independent and reseedable, so no two sections of a page share a surface.

BUILD IT IN FIVE LAYERS, in this order:
1. Base mottling — value noise on a WRAPPING lattice (so it is seamless) at three octaves, roughly 0.56 / 0.29 / 0.15 weights.
2. Trowel streaks — long, shallow quadratic curves at 2-7% alpha, mixed light and dark.
3. Staining — half a dozen large radial gradients at very low alpha.
4. Aggregate — single-pixel specks, about one per 600 pixels of area, mixed light and dark.
5. Edge fall-off — one broad radial gradient darkening the corners.

FOUR THINGS THAT MATTER MORE THAN THE LAYERS:

- PULL THE NOISE TOWARDS MID GREY (roughly 92-196 rather than 0-255). The texture is a MODULATION, not an image. A full-range field pushed through `overlay` crushes whatever is underneath into black and white, which is why most procedural textures look like dirt rather than surface.
- `mix-blend-mode` NEEDS AN ISOLATED PARENT. It composites against everything below it in the stacking context, so without `isolation: isolate` on the wrapper the texture reaches past its own container and tints the whole page.
- RENDER THE NOISE AT HALF RESOLUTION into an offscreen canvas and scale it up. Plaster has no high-frequency detail worth four times the pixels. Draw the aggregate specks at FULL resolution on top, because those do need hard edges.
- ASSIGNING `canvas.width` RESETS THE TRANSFORM as well as clearing the bitmap. Reapply the device-pixel-ratio scale inside the resize handler, never once on mount, and cap DPR at 2 so a 3x phone does not allocate a nine-times buffer.

Track size with a ResizeObserver, start width and height at 0, and paint only when both are above zero. Bail out of the handler when the rounded size has not actually changed — ResizeObserver fires on every pixel of a drag, and repainting a full noise field per pixel is the difference between instant and unusable.

DO NOT ANIMATE IT. A wall does not move. There is no requestAnimationFrame anywhere in this component, which is what makes it free after the first frame.

Props: children, seed, scale, opacity, blend (overlay | soft-light | multiply | screen), tone (cold | neutral | warm).

Output a single self-contained "use client" component.
````
