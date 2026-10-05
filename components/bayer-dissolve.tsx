"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";

/**
 * BayerDissolve — changes state through an ordered-dither dissolve.
 *
 * Give it `items` and an `index`: when the index changes, the new state
 * prints in over the old one in 8x8 Bayer order (65 mask levels in about
 * 720ms) while the screen refines from coarse cells to fine. With `reveal`
 * it prints in from the ground on first view. Renders in place first; hides
 * only once it can animate. CSS masks, no canvas.
 *
 * Part of the Dither & ASCII kit: one ink, paper #f3f0e6, on a warm black
 * ground #0b0b0d, with vermillion #ff4f2b as a second ink inside the
 * pictures and for a live state. Cells snap to whole device pixels;
 * scenes dither in linear light, photographs on a gentler curve. Funnel Display through
 * var(--font-funnel) for display over Geist; Geist Mono for every glyph.
 * Respects prefers-reduced-motion. No dependencies beyond React.
 * Paste it as its own file: it repeats the kit's small helpers, which would
 * clash in one module. Load Funnel Display with next/font (variable:
 * "--font-funnel") on a parent, or from Google Fonts or @fontsource.
 */

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function smooth01(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
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

/** The 8x8 Bayer index of a cell (0-63). Recursive, so every 2x2 and 4x4 block is itself in order. */
function bayer8(x: number, y: number): number {
  let v = 0;
  for (let bit = 0; bit < 3; bit++) {
    const xb = (x >> bit) & 1;
    const yb = (y >> bit) & 1;
    v |= (((xb ^ yb) << 1) | yb) << (2 * (2 - bit));
  }
  return v;
}

const daMaskCache = new Map<number, string>();

/** A mask tile with the first `level` of the 64 Bayer cells opaque: 0 shows nothing, 64 shows everything. */
function daBayerMask(level: number): string {
  const k = clamp(Math.round(level), 0, 64);
  const hit = daMaskCache.get(k);
  if (hit) return hit;
  let d = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (bayer8(x, y) < k) d += `M${x} ${y}h1v1h-1z`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' shape-rendering='crispEdges'><path d='${d}'/></svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  daMaskCache.set(k, url);
  return url;
}

/** The style that masks an element to a Bayer level, tiled at `px` CSS pixels a cell. */
function daMaskStyle(level: number, px: number): CSSProperties {
  const m = daBayerMask(level);
  const s = `${px * 8}px ${px * 8}px`;
  return { maskImage: m, WebkitMaskImage: m, maskSize: s, WebkitMaskSize: s, maskRepeat: "repeat", WebkitMaskRepeat: "repeat" };
}

/**
 * A cell size in CSS pixels snapped to whole device pixels for this element
 * (the screen's pixel ratio times any CSS scale on the way), so every dither
 * cell lands on the pixel grid and never blurs into grey.
 */
function useSnappedCell(ref: RefObject<HTMLElement | null>, cell: number): number {
  const [px, setPx] = useState(cell);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      const k = el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1;
      const dev = (window.devicePixelRatio || 1) * (k || 1);
      setPx(Math.max(1, Math.round(cell * dev)) / dev);
    };
    const ro = new ResizeObserver(() => {
      measure();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref, cell]);
  return px;
}

/**
 * BayerDissolve — changes state through an ordered-dither dissolve.
 *
 * Give it the states as `items` and the one to show as `index`. When the
 * index changes, the new state prints in over the old one cell by cell in
 * 8x8 Bayer order (65 mask levels in about 720ms) while the screen refines
 * from coarse cells to fine ones, then the old state is dropped. With
 * `reveal` it prints in from the ground the first time it comes into view;
 * it renders in place first and only hides once it can animate, so nothing
 * is lost without script. Reduced motion swaps at once. CSS masks, no canvas.
 */
export function BayerDissolve({
  items,
  index = 0,
  reveal = false,
  duration = 720,
  cell = 3,
  refine = true,
  className = "",
  style,
}: {
  items: ReactNode[];
  index?: number;
  /** Print in from the ground on first view. */
  reveal?: boolean;
  duration?: number;
  /** CSS pixels a cell at the end (snapped to device pixels). */
  cell?: number;
  /** Start on cells four times as big and refine as it prints. */
  refine?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const px = useSnappedCell(wrapRef, cell);
  const reduced = useReducedMotion();
  const at = clamp(Math.round(index), 0, Math.max(0, items.length - 1));
  const [s, setS] = useState({ cur: at, prev: -1, run: 0, hold: false, live: false });
  // A new index: keep the old state underneath and print the new one over it.
  // (A reveal still waiting for its first view keeps waiting.)
  if (at !== s.cur) setS({ cur: at, prev: reduced ? -1 : s.cur, run: s.run + 1, hold: s.hold, live: !reduced });

  // The reveal: once it can animate, hide it (level 0) until it comes into view.
  useEffect(() => {
    const el = wrapRef.current;
    if (!reveal || reduced || !el) return;
    const raf = requestAnimationFrame(() => setS((v) => (v.run === 0 ? { ...v, run: 1, hold: true, live: true } : v)));
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setS((v) => (v.hold ? { ...v, hold: false } : v));
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [reveal, reduced]);

  // The dissolve: level 0 to 64, the cell refining from 4x to 1x over the first 70%.
  useEffect(() => {
    const el = topRef.current;
    if (!el || !s.live || s.hold) return;
    let raf = 0;
    let t0 = 0;
    const tick = (now: number) => {
      if (!t0) t0 = now;
      const p = clamp((now - t0) / Math.max(1, duration), 0, 1);
      const scale = refine ? Math.max(1, Math.round(4 - 3 * smooth01(p / 0.7))) : 1;
      Object.assign(el.style, daMaskStyle(64 * p, px * scale));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setS((v) => ({ ...v, prev: -1, live: false }));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [s.run, s.live, s.hold, duration, px, refine]);

  return (
    <div ref={wrapRef} className={"relative isolate " + className} style={style}>
      {s.prev >= 0 ? (
        <div aria-hidden className="absolute inset-0">
          {items[s.prev]}
        </div>
      ) : null}
      <div ref={topRef} key={s.run} className="relative h-full" style={s.live ? daMaskStyle(0, px * (refine ? 4 : 1)) : undefined}>
        {items[s.cur]}
      </div>
    </div>
  );
}
