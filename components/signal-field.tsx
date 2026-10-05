"use client";

import { useEffect, useRef } from "react";

/**
 * SignalField — a machined dot grid that light rolls across.
 *
 * Every dot sits on a fixed grid. Three slow interference waves decide how lit
 * each one is, and the brightest take the tint colour. The pointer is a soft
 * lens that lifts and parts the dots under it, and a click or tap sends a ring
 * of light out through the grid.
 *
 * Place it as the FIRST child of the section it sits behind (the section must
 * be position: relative). It listens for the pointer on that section, not on
 * the canvas, so text and buttons layered above it never block the lens.
 *
 * color / tint take any canvas colour (hex, rgb) OR a CSS custom property
 * such as "var(--accent)", which is resolved from the page and re-read when
 * the theme class on the html element changes.
 */
export function SignalField({
  spacing = 22,
  speed = 1,
  lens = 170,
  ripples = true,
  color = "#e8eaee",
  tint = "#79a4ff",
  className = "",
}: {
  /** Grid pitch in px. */
  spacing?: number;
  /** Wave speed multiplier. 0 holds the light still. */
  speed?: number;
  /** Pointer lens radius in px. 0 turns the lens off. */
  lens?: number;
  /** Click or tap to send a ring of light through the grid. */
  ripples?: boolean;
  /** Resting dot colour — hex, rgb, or "var(--token)". */
  color?: string;
  /** Lit dot colour — hex, rgb, or "var(--token)". */
  tint?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Props are read by the render loop through a ref, so changing one adjusts
  // the next frame instead of tearing the loop down. Synced in an effect —
  // writing a ref during render is a render-phase side effect.
  const opts = useRef({ spacing, speed, lens, ripples, color, tint });
  // Set by the loop effect below; re-reads colours and the grid pitch.
  const refresh = useRef<() => void>(() => {});
  useEffect(() => {
    opts.current = { spacing, speed, lens, ripples, color, tint };
    refresh.current();
  }, [spacing, speed, lens, ripples, color, tint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas ? canvas.parentElement : null;
    const ctx = canvas ? canvas.getContext("2d") : null;
    if (!canvas || !host || !ctx) return;

    const RIPPLE_SPEED = 380;
    const RIPPLE_LIFE = 1.9;
    // Brightness above which a dot takes the tint and blooms.
    const LIT = 0.52;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // "var(--accent)" → the computed value of --accent on the canvas.
    // Anything the canvas can't paint falls back rather than silently drawing
    // in the wrong colour. Bare HSL channels ("222 47% 11%", the shadcn token
    // format) are wrapped in hsl(). The pattern is linear-time on any input.
    function resolve(value: string, fallback: string): string {
      const m = /^var\(\s*(--[\w-]+)\s*(?:,([\s\S]*))?\)$/.exec(value.trim());
      const raw = m
        ? getComputedStyle(canvas as HTMLCanvasElement).getPropertyValue(m[1]).trim() || (m[2] || "").trim()
        : value.trim();
      if (raw && CSS.supports("color", raw)) return raw;
      if (raw && CSS.supports("color", "hsl(" + raw + ")")) return "hsl(" + raw + ")";
      return fallback;
    }

    let ink = "#e8eaee";
    let lit = "#79a4ff";
    function readColors() {
      ink = resolve(opts.current.color, "#e8eaee");
      lit = resolve(opts.current.tint, "#79a4ff");
    }
    readColors();

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let offsetX = 0;
    let offsetY = 0;
    let pitch = opts.current.spacing;
    // x, y and light for every dot, reused across frames (no per-frame
    // allocation). Rebuilt only when the grid size changes.
    let dots = new Float32Array(0);

    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, strength: 0, target: 0 };
    const rings: { x: number; y: number; born: number }[] = [];
    let raf = 0;
    let running = false;
    let onScreen = true;
    let last = 0;
    let clock = 0; // wave time, scaled by speed
    let real = 0; // wall time, for ripples

    function layout() {
      // LAYOUT size, not getBoundingClientRect(): the rect includes ancestor
      // transforms, so inside a scaled card the grid would fill only part of
      // the box, and a ResizeObserver never re-fires to correct it.
      width = host!.clientWidth;
      height = host!.clientHeight;
      let dpr = Math.min(2, window.devicePixelRatio || 1);
      // Cap the backing store near 8 megapixels: mounted in a very tall
      // parent, iOS Safari refuses larger canvases and draws nothing at all.
      if (width * height * dpr * dpr > 8e6) dpr = Math.max(0.5, Math.sqrt(8e6 / (width * height)));
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      pitch = Math.max(8, opts.current.spacing);
      cols = Math.ceil(width / pitch) + 1;
      rows = Math.ceil(height / pitch) + 1;
      // Centre the grid so both margins match.
      offsetX = (width - (cols - 1) * pitch) / 2;
      offsetY = (height - (rows - 1) * pitch) / 2;
      if (dots.length !== cols * rows * 3) dots = new Float32Array(cols * rows * 3);
      if (!running) draw();
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      const t = clock;
      const radius = opts.current.lens;
      const px = pointer.x;
      const py = pointer.y;
      const pull = pointer.strength;

      let n = 0;
      for (let j = 0; j < rows; j++) {
        const gy = offsetY + j * pitch;
        for (let i = 0; i < cols; i++) {
          const gx = offsetX + i * pitch;

          // Three slow interference waves → roughly 0..1 of "light".
          const w =
            Math.sin(gx * 0.0105 + t * 0.32) * Math.cos(gy * 0.0145 - t * 0.21) +
            Math.sin((gx - gy) * 0.0062 + t * 0.17) * 0.8 +
            Math.cos(Math.hypot(gx - width * 0.62, gy + height * 0.1) * 0.012 - t * 0.42) * 0.6;
          let light = Math.max(0, (w + 1.1) / 3.5);
          light = light * light * 1.35;

          let x = gx;
          let y = gy;

          if (pull > 0.001 && radius > 0) {
            const dx = gx - px;
            const dy = gy - py;
            const d = Math.hypot(dx, dy);
            if (d < radius) {
              // Squared falloff: a soft shoulder, no visible circular seam.
              const k = 1 - d / radius;
              const f = k * k * pull;
              light += f * 1.25;
              const push = (f * 7) / (d + 0.001);
              x += dx * push;
              y += dy * push;
            }
          }

          for (let r = 0; r < rings.length; r++) {
            const ring = rings[r];
            const age = real - ring.born;
            const d = Math.hypot(gx - ring.x, gy - ring.y);
            const band = 1 - Math.abs(d - age * RIPPLE_SPEED) / 34;
            if (band > 0) light += band * band * (1 - age / RIPPLE_LIFE) * 1.3;
          }

          dots[n++] = x;
          dots[n++] = y;
          dots[n++] = light;
        }
      }

      // Three passes — resting dots, a faint bloom behind the lit ones, then
      // the lit dots — so the fill style changes three times per frame
      // instead of once per dot.
      for (let pass = 0; pass < 3; pass++) {
        ctx!.fillStyle = pass === 0 ? ink : lit;
        for (let k = 0; k < n; k += 3) {
          const light = dots[k + 2];
          const isLit = light > LIT;
          if ((pass > 0) !== isLit) continue;
          const x = dots[k];
          const y = dots[k + 1];
          if (pass === 1) {
            // Bloom: a wider, very faint square that reads as glow.
            const glow = 5 + Math.min(4, light * 3);
            ctx!.globalAlpha = Math.min(0.16, (light - LIT) * 0.22);
            ctx!.fillRect(x - glow / 2, y - glow / 2, glow, glow);
            continue;
          }
          const size = isLit ? 1.7 + Math.min(1.5, light * 1.1) : 1.3 + light * 1.2;
          ctx!.globalAlpha = isLit ? Math.min(1, 0.55 + light * 0.45) : 0.18 + light * 0.8;
          ctx!.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }
      ctx!.globalAlpha = 1;
    }

    function frame(now: number) {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      clock += dt * opts.current.speed;
      real += dt;

      // Eased toward the target so the lens glides rather than snaps.
      // Time-based easing, so the lens moves at the same speed on a 60Hz and
      // a 120Hz display (a fixed per-frame factor runs twice as fast at 120).
      const follow = 1 - Math.exp(-dt / 0.11);
      const fade = 1 - Math.exp(-dt / 0.2);
      pointer.x += (pointer.tx - pointer.x) * follow;
      pointer.y += (pointer.ty - pointer.y) * follow;
      pointer.strength += (pointer.target - pointer.strength) * fade;

      for (let r = rings.length - 1; r >= 0; r--) {
        if (real - rings[r].born > RIPPLE_LIFE) rings.splice(r, 1);
      }

      draw();
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduced || !onScreen || document.hidden) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    // Pointer position in the canvas's own (untransformed) coordinates. The
    // rect is on screen and may be scaled; width / rect.width undoes that.
    function toLocal(e: PointerEvent): { x: number; y: number; inside: boolean } {
      const rect = canvas!.getBoundingClientRect();
      const sx = rect.width ? width / rect.width : 1;
      const sy = rect.height ? height / rect.height : 1;
      const x = (e.clientX - rect.left) * sx;
      const y = (e.clientY - rect.top) * sy;
      return { x, y, inside: x >= 0 && y >= 0 && x <= width && y <= height };
    }

    function onMove(e: PointerEvent) {
      const { x, y, inside } = toLocal(e);
      // Jump into place on entry so the lens doesn't sweep in from where the
      // pointer last left.
      if (pointer.target === 0 && inside) {
        pointer.x = x;
        pointer.y = y;
      }
      pointer.tx = x;
      pointer.ty = y;
      pointer.target = inside ? 1 : 0;
    }

    function onLeave() {
      pointer.target = 0;
    }

    function onDown(e: PointerEvent) {
      if (reduced || !opts.current.ripples) return;
      const { x, y } = toLocal(e);
      rings.push({ x, y, born: real });
      if (rings.length > 4) rings.shift();
    }

    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    refresh.current = () => {
      readColors();
      layout();
    };

    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(host);

    const io = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      onScreen = entry ? entry.isIntersecting : true;
      if (onScreen) start();
      else stop();
    });
    io.observe(host);

    // A theme switch changes the html element's class; re-resolve colours.
    const mo = new MutationObserver(() => {
      readColors();
      if (!running) draw();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });

    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVisibility);
      refresh.current = () => {};
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={"pointer-events-none absolute inset-0 h-full w-full " + className}
    />
  );
}
