"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * AuroraRibbonCursor — the pointer paints a small aurora.
 *
 * Moving through the area draws a ribbon of light that fades like the sky
 * (800ms by default), coloured by its place along the ribbon from the
 * indigo fringe at the tail to rose at the head, and from every point a
 * short ray rises, so the trail reads as a curtain. Faster strokes throw
 * longer rays. A 2D canvas that draws only while there is light; off under
 * reduced motion.
 *
 * Part of the Aurora kit: a near-black night (#050608) lit by curtains of
 * aurora in mint #7cf5c4 and sky #38bdf8, a violet #a78bfa blend, a rose
 * #f472b6 crown and an indigo #5b6cc4 fringe, all on one 60s clock; Bricolage
 * Grotesque through var(--font-bricolage) for lit display type over Geist.
 * Respects prefers-reduced-motion. No dependencies beyond React. Paste it as
 * its own file: it repeats the kit's small helpers, which would clash in one
 * module. For the display face, load Bricolage Grotesque with next/font
 * (variable: "--font-bricolage") on a parent; elsewhere, load it with a
 * Google Fonts link or @fontsource and set --font-bricolage yourself.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * The sky's colours by altitude: the core low in the curtain (two hues it
 * drifts between on the aurora clock), a violet blend above it, a rose crown
 * seen only in a strong display, and an indigo fringe under the lower border.
 */
export type AuPalette = { core: string; core2: string; blend: string; high: string; fringe: string };

export const AU_PALETTES = {
  boreal: { core: "#7cf5c4", core2: "#38bdf8", blend: "#a78bfa", high: "#f472b6", fringe: "#5b6cc4" },
  verdant: { core: "#6ee7a0", core2: "#7cf5c4", blend: "#8fb4f0", high: "#e879b9", fringe: "#5b6cc4" },
  violet: { core: "#a78bfa", core2: "#38bdf8", blend: "#c4a6fb", high: "#f472b6", fringe: "#4c5bb8" },
} as const satisfies Record<string, AuPalette>;

export type AuPaletteName = keyof typeof AU_PALETTES;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** A named palette, or boreal. */
function paletteOf(name: string): AuPalette {
  return own(AU_PALETTES, name) ? AU_PALETTES[name] : AU_PALETTES.boreal;
}

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt((HEX.test(hex) ? hex : "#7cf5c4").slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function subscribeMotion(cb: () => void) {
  const m = window.matchMedia("(prefers-reduced-motion: reduce)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/** True when the visitor asked for reduced motion. False on the server. */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** The palette as CSS variables, for the parts drawn in CSS. */
function paletteVars(p: AuPalette): CSSProperties {
  return { "--au-core": p.core, "--au-core2": p.core2, "--au-blend": p.blend, "--au-high": p.high, "--au-ring": p.core } as CSSProperties;
}

export type AuroraRibbonCursorProps = {
  children?: ReactNode;
  palette?: AuPaletteName;
  /** How long a stretch of ribbon lasts, 400-1400ms. */
  life?: number;
  /** Width of the ribbon's lit core, 2-6px. */
  width?: number;
  /** Let the ribbon send short rays upward, like a curtain. */
  rays?: boolean;
  /** "under" draws below the children, "over" above them (never catching the pointer). */
  layer?: "under" | "over";
  /** While nobody moves, a slow ghost stroke crosses the area every few seconds (a landing page or a demo); it stops as soon as the pointer moves. */
  attract?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * The pointer paints a small aurora. Moving through the area draws a ribbon
 * of light that fades like the sky (800ms by default): a thin lit core in a
 * soft halo, coloured by its place along the ribbon, from the indigo fringe
 * at the tail through the core hues to violet and rose at the head, and from
 * every point of it a short ray rises and fades, so the trail reads as a
 * curtain, not a line. Faster strokes throw longer rays. It draws on a 2D
 * canvas only while there is light to draw, and not at all under reduced
 * motion. With `attract`, a slow ghost stroke crosses the area every 10.8s
 * until the visitor moves.
 */
export function AuroraRibbonCursor({ children, palette = "boreal", life = 800, width = 3.5, rays = true, layer = "under", attract = false, className, style }: AuroraRibbonCursorProps) {
  const p = paletteOf(palette);
  const reduced = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optsRef = useRef({ p, life, width, rays, attract });
  useEffect(() => {
    optsRef.current = { p, life: Math.max(400, Math.min(1400, life)), width: Math.max(2, Math.min(6, width)), rays, attract };
  });

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W = 1;
    let H = 1;
    let raf = 0;
    let visible = false;
    let lastReal = -1e9;
    const pts: { x: number; y: number; t: number; v: number }[] = [];
    const add = (x: number, y: number, now: number) => {
      const last = pts[pts.length - 1];
      if (last && now - last.t < optsRef.current.life) {
        const dx = x - last.x;
        const dy = y - last.y;
        const d = Math.hypot(dx, dy);
        const v = (d / Math.max(1, now - last.t)) * 1000;
        // Fill long gaps, so the rays stay dense on a fast stroke.
        const n = Math.min(14, Math.floor(d / 6));
        for (let i = 1; i <= n; i++) pts.push({ x: last.x + (dx * i) / (n + 1), y: last.y + (dy * i) / (n + 1), t: last.t + ((now - last.t) * i) / (n + 1), v });
        pts.push({ x, y, t: now, v });
      } else {
        pts.push({ x, y, t: now, v: 0 });
      }
      if (pts.length > 180) pts.splice(0, pts.length - 180);
    };
    // The ghost stroke: 1.8s across the middle of the area every 10.8s, while nobody is moving.
    const ghosting = (now: number) => optsRef.current.attract && visible && now - lastReal > 2500;
    const ghost = (now: number) => {
      const k = (now % 10800) / 1800;
      if (k >= 1) return;
      add(W * (0.12 + 0.76 * k), H * (0.58 - 0.16 * Math.sin(k * Math.PI) + 0.05 * Math.sin(k * Math.PI * 4)), now);
    };
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, host.clientWidth);
      H = Math.max(1, host.clientHeight);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    // Tail to head: the fringe, the two core hues, the blend, the crown.
    const colorAt = (k: number): [number, number, number] => {
      const q = optsRef.current.p;
      const stops = [q.fringe, q.core2, q.core, q.blend, q.high].map(rgbOf);
      const f = Math.max(0, Math.min(1, k)) * (stops.length - 1);
      const i = Math.min(stops.length - 2, Math.floor(f));
      const m = f - i;
      return [0, 1, 2].map((c) => Math.round(stops[i][c] + (stops[i + 1][c] - stops[i][c]) * m)) as [number, number, number];
    };
    const draw = (now: number) => {
      raf = 0;
      const o = optsRef.current;
      if (ghosting(now)) ghost(now);
      while (pts.length && now - pts[0].t > o.life) pts.shift();
      ctx.clearRect(0, 0, W, H);
      if (pts.length < 2) {
        if (pts.length || (o.attract && visible)) raf = requestAnimationFrame(draw);
        return;
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const age = Math.max(0, 1 - (now - b.t) / o.life);
        const [r, g, bl] = colorAt(i / (pts.length - 1));
        const alpha = 0.55 * age * age;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${r},${g},${bl},${(alpha * 0.2).toFixed(3)})`;
        ctx.lineWidth = o.width * 4.5;
        ctx.stroke();
        ctx.strokeStyle = `rgba(${r},${g},${bl},${alpha.toFixed(3)})`;
        ctx.lineWidth = o.width;
        ctx.stroke();
        if (o.rays) {
          // A ray rising from the ribbon, longer for a faster stroke.
          const h = (14 + Math.min(46, b.v * 0.03)) * (0.35 + 0.65 * age);
          const gr = ctx.createLinearGradient(b.x, b.y, b.x, b.y - h);
          gr.addColorStop(0, `rgba(${r},${g},${bl},${(alpha * 0.55).toFixed(3)})`);
          gr.addColorStop(1, `rgba(${r},${g},${bl},0)`);
          ctx.fillStyle = gr;
          ctx.fillRect(b.x - 1, b.y - h, 2, h);
        }
      }
      const head = pts[pts.length - 1];
      const hAge = Math.max(0, 1 - (now - head.t) / o.life);
      const [hr, hg, hb] = colorAt(1);
      const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, o.width * 5);
      glow.addColorStop(0, `rgba(${Math.min(255, hr + 60)},${Math.min(255, hg + 60)},${Math.min(255, hb + 60)},${(0.6 * hAge).toFixed(3)})`);
      glow.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(head.x - o.width * 5, head.y - o.width * 5, o.width * 10, o.width * 10);
      raf = requestAnimationFrame(draw);
    };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      // Layout units, so a scaled host (a thumbnail) still lines up.
      const x = (e.clientX - r.left) * (host.clientWidth / (r.width || 1));
      const y = (e.clientY - r.top) * (host.clientHeight / (r.height || 1));
      const now = performance.now();
      if (now - lastReal > 2500) pts.length = 0;
      lastReal = now;
      add(x, y, now);
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible && !raf && optsRef.current.attract) raf = requestAnimationFrame(draw);
    });
    const ro = new ResizeObserver(size);
    size();
    ro.observe(host);
    io.observe(host);
    host.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      host.removeEventListener("pointermove", onMove);
    };
  }, [reduced]);

  return (
    <div ref={hostRef} className={"au-scope relative isolate" + (className ? " " + className : "")} style={{ ...paletteVars(p), ...style }}>
      <canvas ref={canvasRef} aria-hidden className={"pointer-events-none absolute inset-0 h-full w-full " + (layer === "over" ? "z-[2]" : "z-0")} />
      {children !== undefined && <div className="relative z-[1]">{children}</div>}
    </div>
  );
}
