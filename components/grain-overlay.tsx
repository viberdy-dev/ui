"use client";

import { useEffect, useRef } from "react";

/**
 * SIZED BY ITS PARENT — the parent needs a height.
 *
 * This fills the box it is given: the canvas is absolutely positioned, so
 * the wrapper has nothing in normal flow to derive a height from. Drop it
 * into a plain section or a hero with no height set and it lays out at zero
 * and renders nothing — no error, no warning, no console message, just an
 * empty rectangle, which is the hardest kind of failure to go looking for.
 *
 * Give the parent a real height (h-screen, h-[520px], an aspect-ratio, a
 * grid track) or position this against one that already has one.
 */
export function GrainOverlay({
  density = 3,
  opacity = 0.08,
  animated = true,
  fps = 24,
}: {
  density?: number;
  opacity?: number;
  /** Grain re-roll rate. Film is 24; the display's 60 is harsher and costlier. */
  fps?: number;
  /** Re-roll the noise every frame. Off paints one static field and stops. */
  animated?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Measure via ResizeObserver, not a one-time offsetWidth read — in a
    // scaled thumbnail the canvas can still be 0x0 on first paint, and
    // createImageData(0, 0) throws.
    let width = 0;
    let height = 0;
    let raf = 0;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      width = Math.max(0, Math.round(entry.contentRect.width));
      height = Math.max(0, Math.round(entry.contentRect.height));
      canvas.width = width;
      canvas.height = height;
      // Assigning width CLEARS the bitmap, and with animation off there is no
      // loop to put it back — a static grain would sit blank from the first
      // resize onward. It also covers the very first measurement, where the
      // canvas is still 0x0 when the initial paint runs.
      paint();
    });
    observer.observe(canvas);

    // GRAIN HAS A FRAME RATE, and it is not the display's. Real film runs at
    // 24, and re-rolling every pixel 60 times a second is both harsher than
    // any photochemical grain and two and a half times the work. The loop
    // still runs every frame — it just only REDRAWS when enough time has
    // passed, so the cost scales with the chosen rate rather than the monitor.
    let lastDraw = 0;
    const minGap = fps > 0 ? 1000 / fps : 0;

    function paint(now?: number) {
      // A call with no timestamp is a DIRECT one — the first paint, or a
      // repaint after a resize — and it always draws. Only the rAF-driven
      // calls, which arrive with a timestamp, are rate-gated. Without this the
      // static mode never paints at all, because there is no loop behind it to
      // try again.
      const stamp = now === undefined ? lastDraw : now;
      const due = now === undefined || minGap === 0 || stamp - lastDraw >= minGap;
      if (due && width > 0 && height > 0) {
        lastDraw = stamp;
        const imageData = ctx!.createImageData(width, height);
        const buffer = imageData.data;
        //
        // THE STEP MUST BE AT LEAST ONE WHOLE PIXEL.
        //
        // density is an ordinary number prop, so 0 is a value someone can
        // pass — from a quality slider, a CMS field, a parsed query string.
        // At 0 this reads i += 0: a for-loop that never advances and never
        // exits. That is not a slow frame, it is a permanently hung tab that
        // has to be force-killed. The min in the schema constrains this
        // demo's slider, NOT the component anyone copies out of here.
        const step = 4 * Math.max(1, Math.round(Number(density) || 1));
        for (let i = 0; i < buffer.length; i += step) {
          const shade = Math.random() * 255;
          buffer[i] = shade;
          buffer[i + 1] = shade;
          buffer[i + 2] = shade;
          buffer[i + 3] = 255;
        }
        ctx!.putImageData(imageData, 0, 0);
      }
      if (animated) raf = requestAnimationFrame(paint);
    }
    paint();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [density, animated, fps]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full mix-blend-overlay"
      style={{ opacity }}
    />
  );
}
