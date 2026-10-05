"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";

/**
 * DitherDevelopCard — a card whose image prints in the first time it's seen, lit by the pointer through the dither.
 *
 * The picture (your image, or one of three code-drawn stills) is ordered-
 * dithered with CSS alone at 2px cells on a tone curve. On first view its
 * light rises from nothing over about 1.1s, so the cells print in brightest
 * first; hover it and a soft light follows the pointer, dithered with the
 * picture. A mono caption names the transform.
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

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

const DISPLAY = 'var(--font-funnel, "Funnel Display", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** One ink on a warm black ground, and one signal colour. */
const SHEET = {
  ground: "#0b0b0d",
  panel: "#121214",
  raised: "#19191c",
  paper: "#f3f0e6",
  ink: "rgba(243,240,230,0.92)",
  ink2: "rgba(243,240,230,0.6)",
  ink3: "rgba(243,240,230,0.38)",
  line: "rgba(243,240,230,0.08)",
  line2: "rgba(243,240,230,0.16)",
  signal: "#ff4f2b",
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Links: strip tabs and newlines, refuse backslashes, allow http(s), mailto, tel and same-site paths. */
function safeHref(raw: string): string {
  const v = raw.replace(/[\t\n\r]/g, "").trim();
  if (!v || v.includes("\\")) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#?]/.test(v) && !/^\/\//.test(v)) return v;
  return "#";
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

// Each part carries only the CSS it needs, so any one of them works on its own.
// Nothing is interpolated into these sheets; colours arrive as CSS variables.
// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".da-scope :focus-visible,.da-scope:focus-visible{outline:2px solid var(--da-ring,#ff4f2b)!important;outline-offset:3px;border-radius:revert-layer}";

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

const daTileCache = new Map<number, string>();

/**
 * The 8x8 Bayer thresholds as a tile of greys, inverted, for dithering any
 * element with CSS alone (see DitherLayer). Each threshold t is stored as
 * t^(1/gamma): at 2.2 the comparison is in linear light (the share of lit
 * cells matches the light exactly, which thins every midtone); at 1 it is
 * straight sRGB; 1.5 keeps photographs full without crushing the shadows.
 */
function daBayerTile(gamma: number): string {
  const k = Math.round(clamp(gamma, 0.5, 3) * 10) / 10;
  const hit = daTileCache.get(k);
  if (hit) return hit;
  let rects = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const t = Math.pow((bayer8(x, y) + 0.5) / 64, 1 / k);
      const g = Math.round((1 - t) * 255);
      rects += `<rect x='${x}' y='${y}' width='1' height='1' fill='rgb(${g},${g},${g})'/>`;
    }
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' shape-rendering='crispEdges'>${rects}</svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  daTileCache.set(k, url);
  return url;
}

/** Image sources: http(s), same-site paths, blob: and data:image/ (for dropped files); nothing else. */
function safeSrc(raw: string): string {
  const v = raw.replace(/[\t\n\r]/g, "").trim();
  if (!v || v.includes("\\")) return "";
  if (/^(https?:|blob:)/i.test(v) || /^data:image\/(png|jpe?g|gif|webp|avif);/i.test(v)) return v;
  if (/^[/.]/.test(v) && !/^\/\//.test(v)) return v;
  return "";
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

/** True once the element has come into view (and stays true); true at once without IntersectionObserver. */
function useFirstView(ref: RefObject<HTMLElement | null>, threshold = 0.3): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setSeen(true));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, seen]);
  return seen;
}

/**
 * DitherLayer: ordered-dithers whatever is inside it (an image, a gradient,
 * text, video) with CSS alone. The content is made grey, a tile of Bayer
 * thresholds is laid over it at half opacity, and a very high contrast on
 * the group turns every pixel into on or off by which of the two is lighter.
 * The result is then inked: lit cells in `ink`, the rest in `ground`.
 * `level` scales the light (0 prints nothing, 1 the full picture) and
 * transitions, so a change prints in or out cell by cell. With `light`, a
 * soft light follows the pointer and is dithered with the picture.
 */
function DitherLayer({
  children,
  cell = 2,
  ink = SHEET.paper,
  ground = SHEET.ground,
  level = 1,
  light = false,
  lightSize = 240,
  duration = 900,
  gamma = 1.5,
  className = "",
  style,
}: {
  children: ReactNode;
  /** CSS pixels a cell, snapped to whole device pixels. */
  cell?: number;
  ink?: string;
  ground?: string;
  /** How much of the light prints: 0 nothing, 1 all of it; above 1 brightens. */
  level?: number;
  /** A light that follows the pointer, dithered with the picture. */
  light?: boolean;
  lightSize?: number;
  /** How long a change of level takes to print, in ms. */
  duration?: number;
  /** Tone curve of the thresholds: 2.2 is strict linear light, 1 straight sRGB. */
  gamma?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const px = useSnappedCell(ref, cell);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    const lamp = lightRef.current;
    if (!light || !el || !lamp) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
      lamp.style.setProperty("--da-lx", `${(e.clientX - r.left) / k}px`);
      lamp.style.setProperty("--da-ly", `${(e.clientY - r.top) / k}px`);
      lamp.style.opacity = "1";
    };
    const leave = () => {
      lamp.style.opacity = "0";
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [light]);

  return (
    <div ref={ref} className={"relative isolate overflow-hidden " + className} style={{ background: ground, ...style }}>
      <div className="absolute inset-0" style={{ filter: "contrast(255)", background: "#000" }}>
        <div
          className="absolute inset-0"
          style={{ filter: `grayscale(1) brightness(${level})`, transition: reduced ? "none" : `filter ${duration}ms ${EASE}` }}
        >
          {children}
        </div>
        {light ? (
          <div
            ref={lightRef}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: 0,
              background: `radial-gradient(${lightSize}px circle at var(--da-lx, 50%) var(--da-ly, 50%), rgba(255,255,255,0.62), rgba(255,255,255,0.18) 40%, transparent 72%)`,
              mixBlendMode: "screen",
              transition: reduced ? "none" : `opacity 420ms ${EASE}`,
            }}
          />
        ) : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ opacity: 0.5, backgroundImage: daBayerTile(gamma), backgroundSize: `${px * 8}px ${px * 8}px`, imageRendering: "pixelated" }}
        />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: ink, mixBlendMode: "multiply" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: ground, mixBlendMode: "screen" }} />
    </div>
  );
}

/** Code-drawn stills for the cards (greys only: the dither inks them). */
export type DaArt = "sphere" | "rings" | "stack";

function DaStill({ kind }: { kind: DaArt }) {
  // Gradient ids are per instance, so several stills on one page never share one.
  const id = "da" + useId().replace(/[^a-zA-Z0-9]/g, "");
  if (kind === "rings") {
    return (
      <svg aria-hidden viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`${id}-rg-ring`} cx="0.38" cy="0.3" r="0.9">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.55" stopColor="#a6a6a6" />
            <stop offset="1" stopColor="#2a2a2a" />
          </radialGradient>
          <linearGradient id={`${id}-lg-floor`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#262626" />
            <stop offset="1" stopColor="#7a7a7a" />
          </linearGradient>
        </defs>
        <rect width="320" height="200" fill="#050505" />
        <rect y="132" width="320" height="68" fill={`url(#${id}-lg-floor)`} />
        <ellipse cx="170" cy="160" rx="92" ry="10" fill="#000" opacity="0.8" />
        {[0, 1, 2, 3].map((i) => (
          <ellipse key={i} cx={160 + i * 8} cy={98 - i * 4} rx={72 - i * 13} ry={58 - i * 11} fill="none" stroke={`url(#${id}-rg-ring)`} strokeWidth={17 - i * 2.5} />
        ))}
      </svg>
    );
  }
  if (kind === "stack") {
    return (
      <svg aria-hidden viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={`${id}-lg-top`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#a8a8a8" />
          </linearGradient>
          <linearGradient id={`${id}-lg-side`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6a6a6a" />
            <stop offset="1" stopColor="#1c1c1c" />
          </linearGradient>
        </defs>
        <rect width="320" height="200" fill="#060606" />
        {[0, 1, 2, 3, 4].map((i) => {
          const y = 150 - i * 22;
          return (
            <g key={i} opacity={1 - i * 0.12}>
              <path d={`M160 ${y - 26} L236 ${y} L160 ${y + 26} L84 ${y} Z`} fill={`url(#${id}-lg-top)`} />
              <path d={`M84 ${y} L160 ${y + 26} L160 ${y + 34} L84 ${y + 8} Z`} fill={`url(#${id}-lg-side)`} />
              <path d={`M236 ${y} L160 ${y + 26} L160 ${y + 34} L236 ${y + 8} Z`} fill="#3e3e3e" />
            </g>
          );
        })}
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <radialGradient id={`${id}-rg-ball`} cx="0.36" cy="0.32" r="0.72">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.45" stopColor="#c4c4c4" />
          <stop offset="0.85" stopColor="#404040" />
          <stop offset="1" stopColor="#181818" />
        </radialGradient>
        <radialGradient id={`${id}-rg-shadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-lg-plane`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141414" />
          <stop offset="0.45" stopColor="#8e8e8e" />
          <stop offset="1" stopColor="#3c3c3c" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="#050505" />
      <rect y="112" width="320" height="88" fill={`url(#${id}-lg-plane)`} />
      <ellipse cx="198" cy="160" rx="96" ry="17" fill={`url(#${id}-rg-shadow)`} />
      <circle cx="160" cy="100" r="64" fill={`url(#${id}-rg-ball)`} />
    </svg>
  );
}

/**
 * DitherDevelopCard — a card whose image prints in the first time it's
 * seen, and is lit through the dither by the pointer.
 *
 * The picture (your image, or one of three code-drawn stills) is ordered-
 * dithered with CSS alone at 2px cells snapped to device pixels, in linear
 * light. On first view its light rises from nothing over about 1.1s, so the
 * cells print in brightest first, like a proof developing; hover it and a
 * soft light follows the pointer, dithered with the picture. A mono caption
 * names the transform; a signal square marks it live.
 */
export function DitherDevelopCard({
  title,
  kicker,
  body,
  image,
  alt = "",
  art = "sphere",
  caption = "1-bit · Bayer 8×8 · 2px",
  href,
  cell = 2,
  className = "",
}: {
  title: string;
  kicker?: string;
  body?: string;
  /** Your picture (http(s), a same-site path, blob: or data:image/). */
  image?: string;
  alt?: string;
  /** A code-drawn still when there is no image. */
  art?: DaArt;
  caption?: string;
  href?: string;
  cell?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useFirstView(ref, 0.35);
  const reduced = useReducedMotion();
  const src = image ? safeSrc(image) : "";
  const [hot, setHot] = useState(false);
  const inner = (
    <>
      <DitherLayer className="aspect-[16/10] w-full" cell={cell} level={seen || reduced ? (hot ? 1.12 : 1) : 0} light duration={1100}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- pasted into any project: a plain img needs no next/image config
          <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        ) : (
          <DaStill kind={art} />
        )}
      </DitherLayer>
      <div className="flex flex-col gap-2 p-5">
        <div className="flex items-center justify-between gap-3">
          {kicker ? (
            <span className="text-[10.5px] uppercase" style={{ fontFamily: MONO, letterSpacing: "0.14em", color: SHEET.ink3 }}>
              {kicker}
            </span>
          ) : (
            <span />
          )}
          <span aria-hidden className="h-[7px] w-[7px]" style={{ background: seen ? SHEET.signal : SHEET.line2, transition: `background 600ms ${EASE}` }} />
        </div>
        <h3 className="m-0 text-[22px] font-semibold leading-[1.15]" style={{ fontFamily: DISPLAY, letterSpacing: "-0.02em", color: SHEET.paper }}>
          {title}
        </h3>
        {body ? (
          <p className="m-0 text-[14px] leading-[1.55]" style={{ color: SHEET.ink2 }}>
            {body}
          </p>
        ) : null}
        <p className="m-0 mt-1 text-[10.5px] uppercase" style={{ fontFamily: MONO, letterSpacing: "0.1em", color: SHEET.ink3 }}>
          {caption}
        </p>
      </div>
    </>
  );
  const shell =
    "da-scope group relative flex flex-col overflow-hidden rounded-[14px] no-underline outline-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 " + className;
  const shellStyle: CSSProperties = { background: SHEET.panel, border: `1px solid ${SHEET.line}`, color: SHEET.ink, fontFamily: SANS };
  return (
    <div ref={ref} className="h-full">
      <style>{FOCUS_CSS}</style>
      {href ? (
        <a href={safeHref(href)} className={shell + " h-full"} style={shellStyle} onPointerEnter={() => setHot(true)} onPointerLeave={() => setHot(false)} onFocus={() => setHot(true)} onBlur={() => setHot(false)}>
          {inner}
        </a>
      ) : (
        <article className={shell + " h-full"} style={shellStyle} onPointerEnter={() => setHot(true)} onPointerLeave={() => setHot(false)}>
          {inner}
        </article>
      )}
    </div>
  );
}
