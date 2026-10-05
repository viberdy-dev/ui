"use client";

import { useEffect, useRef, type ReactNode } from "react";

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Value noise on a WRAPPING 64x64 lattice with a smoothstep interpolant.
 * Wrapping is what keeps the field seamless at any canvas size.
 */
function makeNoise(seed: number) {
  const rnd = mulberry32(seed);
  const G = 64;
  const grid = new Float32Array(G * G);
  for (let i = 0; i < grid.length; i += 1) grid[i] = rnd();
  const at = (x: number, y: number) => grid[(((y % G) + G) % G) * G + (((x % G) + G) % G)];
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
  };
}

export function ConcreteWallTexture({
  children,
  seed = 4817,
  scale = 1,
  opacity = 0.62,
  blend = "overlay",
  tone = "neutral",
}: {
  children?: ReactNode;
  seed?: number;
  scale?: number;
  opacity?: number;
  blend?: "overlay" | "soft-light" | "multiply" | "screen";
  tone?: "cold" | "neutral" | "warm";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const tint =
      tone === "cold" ? [0.96, 0.99, 1.05] : tone === "warm" ? [1.05, 1.0, 0.93] : [1, 1, 1];

    const paint = () => {
      if (w <= 0 || h <= 0) return;
      const rnd = mulberry32(seed ^ 0x9e37);
      const noise = makeNoise(seed);

      // --- base mottling, HALF RESOLUTION ---------------------------------
      // Plaster has no high-frequency detail worth four times the pixels. The
      // aggregate specks, which do need hard edges, are drawn at full
      // resolution further down.
      const nw = Math.max(1, Math.ceil(w / 2));
      const nh = Math.max(1, Math.ceil(h / 2));
      const off = document.createElement("canvas");
      off.width = nw;
      off.height = nh;
      const octx = off.getContext("2d");
      if (!octx) return;

      const img = octx.createImageData(nw, nh);
      const d = img.data;
      const f = 0.05 / Math.max(0.2, scale);
      for (let y = 0; y < nh; y += 1) {
        for (let x = 0; x < nw; x += 1) {
          const v =
            noise(x * f, y * f) * 0.56 +
            noise(x * f * 2.3, y * f * 2.3) * 0.29 +
            noise(x * f * 5.7, y * f * 5.7) * 0.15;
          // PULLED TOWARDS MID GREY. The texture is a modulation, not an
          // image: a full-range field pushed through overlay crushes whatever
          // is underneath it into black and white.
          const g = 92 + Math.pow(v, 1.12) * 104;
          const i = (y * nw + x) * 4;
          d[i] = Math.min(255, g * tint[0]);
          d[i + 1] = Math.min(255, g * tint[1]);
          d[i + 2] = Math.min(255, g * tint[2]);
          d[i + 3] = 255;
        }
      }
      octx.putImageData(img, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(off, 0, 0, w, h);

      // --- trowel streaks ---------------------------------------------------
      for (let i = 0; i < 30; i += 1) {
        const y0 = rnd() * h;
        const x0 = -w * 0.15 + rnd() * w;
        const len = w * (0.25 + rnd() * 0.8);
        const light = rnd() < 0.5;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(
          x0 + len * 0.5,
          y0 + (rnd() - 0.5) * h * 0.14,
          x0 + len,
          y0 + (rnd() - 0.5) * h * 0.07,
        );
        ctx.lineWidth = 1 + rnd() * 7;
        ctx.strokeStyle =
          (light ? "rgba(255,255,255," : "rgba(0,0,0,") + (0.02 + rnd() * 0.05) + ")";
        ctx.stroke();
      }

      // --- staining ----------------------------------------------------------
      for (let i = 0; i < 6; i += 1) {
        const cx = rnd() * w;
        const cy = rnd() * h;
        const r = Math.max(w, h) * (0.14 + rnd() * 0.3);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, rnd() < 0.62 ? "rgba(0,0,0,0.13)" : "rgba(255,255,255,0.09)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // --- aggregate, FULL resolution -----------------------------------------
      const specks = Math.round((w * h) / 620);
      for (let i = 0; i < specks; i += 1) {
        const x = rnd() * w;
        const y = rnd() * h;
        const big = rnd() < 0.12;
        ctx.fillStyle =
          rnd() < 0.55
            ? "rgba(0,0,0," + (0.06 + rnd() * 0.16) + ")"
            : "rgba(255,255,255," + (0.05 + rnd() * 0.13) + ")";
        ctx.fillRect(x, y, big ? 2 : 1, big ? 2 : 1);
      }

      // --- edge fall-off --------------------------------------------------------
      const vg = ctx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.25,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.78,
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.26)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nw = Math.max(0, Math.round(entry.contentRect.width));
      const nh = Math.max(0, Math.round(entry.contentRect.height));
      // ResizeObserver fires on every pixel of a drag. Repainting a whole
      // noise field per pixel is the difference between instant and unusable.
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      // Assigning width or height RESETS the transform as well as clearing the
      // bitmap, so the DPR scale is reapplied here rather than once on mount.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [seed, scale, tone]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      // mix-blend-mode composites against EVERYTHING below it in the stacking
      // context. Without isolation the texture reaches past this box and tints
      // the page behind it.
      style={{ isolation: "isolate" }}
    >
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: blend, opacity }}
      />
    </div>
  );
}
