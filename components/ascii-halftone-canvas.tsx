"use client";

import { useEffect, useRef } from "react";

const RAMP = " .:-=+*#%@";

export function AsciiHalftoneCanvas({
  draw,
  cols = 54,
  invert = false,
  animate = true,
  speed = 0.35,
}: {
  /**
   * Paints the source frame. Receives a 2D context already sized to the
   * CHARACTER grid (cols x lines), plus `t`, a seconds counter for animation.
   * Taking a draw callback instead of an image src is deliberate — see the
   * tainting note below.
   */
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
  cols?: number;
  invert?: boolean;
  /** Advance the seconds counter passed to the draw callback. Off freezes it. */
  animate?: boolean;
  /** Radians per second the key light travels. Ambient is well under 1. */
  speed?: number;
}) {
  const preRef = useRef<HTMLPreElement>(null);
  const frame = useRef<number | null>(null);
  const opts = useRef({ cols, invert, animate, draw, speed });

  useEffect(() => {
    opts.current = { cols, invert, animate, draw, speed };
  }, [cols, invert, animate, draw, speed]);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    // willReadFrequently tells the browser to keep this canvas on the CPU.
    // Without it, a GPU-backed canvas has to be read back every frame, which
    // is far slower for a getImageData-per-frame workload like this one.
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    // Re-bound so render() below, a hoisted function, sees it as non-null
    // under strict TypeScript.
    const ctx: CanvasRenderingContext2D = context;

    let t = 0;
    let last = 0;

    function render() {
      const { cols: rawCols, invert: inv, animate: anim, draw: paint, speed: sp } = opts.current;
      // BOUNDED BEFORE IT SIZES A CANVAS.
      //
      // cols is a CHARACTER count, but nothing in the type says so — it is
      // just a number. A copier who reads it as pixels and passes 5000 gets
      // a 5000x2100 canvas reallocated every frame: roughly 42MB per
      // getImageData call, sixty times a second, wrapped around a
      // ten-million-iteration string concatenation inside the rAF callback.
      // The frame is gone long before anything paints. The ceiling here is
      // what makes that unreachable.
      const c = Math.min(200, Math.max(4, Math.round(Number(rawCols) || 54)));
      // The offscreen canvas is sized to the CHARACTER grid, not the display
      // size: one pixel read per glyph, so cost tracks the number of
      // characters shown rather than the resolution.
      const lines = Math.max(4, Math.round(c * 0.42)); // glyph aspect ratio
      canvas.width = c;
      canvas.height = lines;
      //
      // TIME-BASED, NOT PER-FRAME.
      //
      // Advancing a fixed amount every frame ties the animation to the refresh
      // rate: the same code runs at DOUBLE speed on a 120Hz display and half
      // speed on a throttled tab, and you never see it on the machine you
      // built it on. The delta is clamped so a backgrounded tab does not
      // return and jump the light a quarter of the way round its orbit.
      //
      const now = performance.now();
      const dt = last ? Math.min(100, now - last) : 16.7;
      last = now;
      if (anim) t += (dt / 1000) * sp;

      paint(ctx, c, lines, t);

      const data = ctx.getImageData(0, 0, c, lines).data;
      let out = "";
      for (let y = 0; y < lines; y++) {
        for (let x = 0; x < c; x++) {
          const i = (y * c + x) * 4;
          // Rec. 601 luma — perceptual, unlike a flat (r+g+b)/3 average.
          const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
          const v = inv ? 1 - lum : lum;
          out += RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))];
        }
        out += "\n";
      }

      // Written straight to the DOM node. Holding this in React state would
      // mean a full component render 60 times a second to update a string.
      if (preRef.current) preRef.current.textContent = out;

      frame.current = requestAnimationFrame(render);
    }

    frame.current = requestAnimationFrame(render);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <pre
      ref={preRef}
      className="select-none font-mono leading-[0.78]"
      style={{ fontSize: 8 }}
    />
  );
}
