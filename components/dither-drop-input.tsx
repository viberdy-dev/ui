"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent, CSSProperties, DragEvent as ReactDragEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";

/**
 * DitherDropInput — drop an image, see it dithered here, and get the request for it.
 *
 * A real file input (click, keyboard or drag). The image never leaves the
 * browser: it prints in through the kit's CSS dither. Choose the cell size
 * and ink, set the exposure; the request URL updates as you go, and
 * submitting copies it or hands everything to `onSubmit`. Images only, up to
 * `maxBytes`; object URLs are released.
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
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries plugin).
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

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

/** Image sources: http(s), same-site paths, blob: and data:image/ (for dropped files); nothing else. */
function safeSrc(raw: string): string {
  const v = raw.replace(/[\t\n\r]/g, "").trim();
  if (!v || v.includes("\\")) return "";
  if (/^(https?:|blob:)/i.test(v) || /^data:image\/(png|jpe?g|gif|webp|avif);/i.test(v)) return v;
  if (/^[/.]/.test(v) && !/^\/\//.test(v)) return v;
  return "";
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

const DA_BUTTON_INK = {
  signal: { fill: SHEET.signal, text: SHEET.ground, border: SHEET.signal, label: SHEET.paper, rest: 5 },
  paper: { fill: SHEET.paper, text: SHEET.ground, border: "rgba(243,240,230,0.5)", label: SHEET.paper, rest: 5 },
  ghost: { fill: SHEET.paper, text: SHEET.ground, border: SHEET.line2, label: SHEET.ink, rest: 0 },
} as const;

export type DaButtonVariant = keyof typeof DA_BUTTON_INK;

/**
 * BayerFillButton — a button whose fill prints in, cell by cell.
 *
 * At rest a few cells of its ink sit in the face. Hover or focus it and the
 * fill develops through the 8x8 Bayer order to solid in about 260ms (and
 * back out in 360ms), while the label inverts exactly where each cell
 * lands, because the inverted label lives inside the masked fill. Press it
 * and the grid halves to a finer screen and the face drops a pixel. Signal,
 * paper and ghost inks; `lit` holds it filled (a chosen option). CSS masks
 * and a few lines of animation, no canvas.
 */
export function BayerFillButton({
  children,
  href,
  onClick,
  type = "button",
  variant = "paper",
  size = "lg",
  lit = false,
  disabled = false,
  ariaLabel,
  ariaPressed,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: DaButtonVariant;
  size?: "lg" | "md" | "sm";
  /** Hold it filled, for a chosen option. */
  lit?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
  className?: string;
}) {
  const ink = DA_BUTTON_INK[variant] ?? DA_BUTTON_INK.signal;
  const rootRef = useRef<HTMLElement | null>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const px = useSnappedCell(rootRef, 2);
  const state = useRef({ level: lit ? 64 : ink.rest, hover: false, focus: false, down: false, raf: 0, last: 0 });
  const [down, setDown] = useState(false);
  const litRef = useRef(lit);
  // The mask React renders never changes after the first render: the loop below owns it from then on.
  const [firstMask] = useState(() => daMaskStyle(lit ? 64 : ink.rest, 2));

  // One small loop: the level walks toward its target (in 260ms, out 360ms) and the mask follows.
  const run = () => {
    const s = state.current;
    if (s.raf) return;
    s.last = 0;
    const tick = (now: number) => {
      s.raf = 0;
      const el = fillRef.current;
      if (!el) return;
      const dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 1 / 60;
      s.last = now;
      const want = litRef.current || s.hover || s.focus || s.down ? 64 : ink.rest;
      const rate = want > s.level ? 64 / 0.26 : 64 / 0.36;
      s.level = reduced ? want : want > s.level ? Math.min(want, s.level + rate * dt) : Math.max(want, s.level - rate * dt);
      Object.assign(el.style, daMaskStyle(s.level, s.down ? px / 2 : px));
      if (s.level !== want) s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  };
  useEffect(() => {
    litRef.current = lit;
    run();
  });
  // Cancel on unmount and clear the handle, or a remount (StrictMode does one) would never start the loop again.
  useEffect(() => {
    const s = state.current;
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, []);

  const set = (patch: Partial<{ hover: boolean; focus: boolean; down: boolean }>) => {
    Object.assign(state.current, patch);
    if (patch.down !== undefined) setDown(patch.down);
    run();
  };
  const pad = size === "sm" ? "h-8 px-3 text-[12px]" : size === "md" ? "h-10 px-4 text-[13px]" : "h-12 px-6 text-[14px]";
  const common = {
    className:
      "da-scope relative isolate inline-flex select-none items-center justify-center overflow-hidden rounded-[10px] font-medium no-underline outline-none transition-transform duration-150 " +
      pad +
      (disabled ? " pointer-events-none opacity-40 " : " ") +
      className,
    style: {
      border: `1px solid ${ink.border}`,
      color: ink.label,
      background: SHEET.ground,
      fontFamily: SANS,
      letterSpacing: "0.005em",
      transform: down ? "translateY(1px)" : undefined,
    } as CSSProperties,
    "aria-label": ariaLabel,
    onPointerEnter: () => set({ hover: true }),
    onPointerLeave: () => set({ hover: false, down: false }),
    onPointerDown: () => set({ down: true }),
    onPointerUp: () => set({ down: false }),
    onPointerCancel: () => set({ down: false }),
    onFocus: () => set({ focus: true }),
    onBlur: () => set({ focus: false, down: false }),
    // Enter activates both; Space activates only a button (a link scrolls on Space), so only then does it press.
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key === "Enter" || (e.key === " " && !href)) set({ down: true });
    },
    onKeyUp: () => set({ down: false }),
  };
  const face = (
    <>
      <span className="relative whitespace-nowrap">{children}</span>
      <span
        ref={fillRef}
        aria-hidden
        className={"pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap " + pad}
        style={{ background: ink.fill, color: ink.text, ...firstMask }}
      >
        {children}
      </span>
    </>
  );
  if (href) {
    return (
      <>
        <style>{FOCUS_CSS}</style>
        <a ref={(el) => void (rootRef.current = el)} href={safeHref(href)} onClick={onClick} {...common}>
          {face}
        </a>
      </>
    );
  }
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <button ref={(el) => void (rootRef.current = el)} type={type} onClick={onClick} disabled={disabled} aria-pressed={ariaPressed} {...common}>
        {face}
      </button>
    </>
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

export type DaDropValue = { file: File | null; cell: number; ink: "paper" | "signal"; exposure: number; url: string };

/** A file name made safe for a URL path: lower case, a-z 0-9 and dashes, 48 characters at most. */
function daSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "image"
  );
}

/**
 * DitherDropInput — drop an image, see it dithered here, and get the
 * request that would deliver it.
 *
 * The drop zone is a real file input (click, keyboard or drag). The image
 * never leaves the browser: it is shown through the kit's CSS dither and
 * prints in cell by cell. Choose the cell size and the ink, and set the
 * exposure; the request URL updates as you go, and submitting copies it
 * (or hands everything to `onSubmit`). Only images, up to `maxBytes`; the
 * object URL is released when it's replaced.
 */
export function DitherDropInput({
  label = "Drop an image",
  hint = "PNG, JPG, WebP or AVIF. It stays in your browser.",
  endpoint = "/v1/i/",
  maxBytes = 20 * 1024 * 1024,
  onSubmit,
  className = "",
  style,
}: {
  label?: string;
  hint?: string;
  /** Shown before the file name in the request; never fetched. */
  endpoint?: string;
  maxBytes?: number;
  /** Receives the file and settings; without it, submitting copies the URL. */
  onSubmit?: (value: DaDropValue) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const inputId = useId();
  const hintId = useId();
  const groupId = useId();
  const expId = useId();
  const fileRef = useRef<File | null>(null);
  const [pic, setPic] = useState<{ url: string; name: string } | null>(null);
  const [cell, setCell] = useState(2);
  const [ink, setInk] = useState<"paper" | "signal">("paper");
  const [exposure, setExposure] = useState(1);
  const [level, setLevel] = useState(1);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");

  // Release each object URL once it is replaced or the input goes away.
  useEffect(() => {
    const url = pic?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [pic]);

  // A guard for the preview, not a security check: File.type comes from the name. If onSubmit uploads
  // the file, validate it again on the server (type by its bytes, size, dimensions).
  const take = (f: File | undefined | null) => {
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      setErr("That file isn't an image.");
      return;
    }
    if (f.size > maxBytes) {
      setErr(`That image is over ${Math.round(maxBytes / 1024 / 1024)} MB.`);
      return;
    }
    setErr("");
    setDone("");
    fileRef.current = f;
    setPic({ url: URL.createObjectURL(f), name: f.name });
    setLevel(0);
    requestAnimationFrame(() => requestAnimationFrame(() => setLevel(1)));
  };

  const url = `${endpoint}${pic ? daSlug(pic.name) : "your-image"}.png?t=bayer8&cell=${cell}&ink=${ink}&exp=${exposure.toFixed(2)}`;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value: DaDropValue = { file: fileRef.current, cell, ink, exposure, url };
    if (onSubmit) {
      onSubmit(value);
      setDone("Sent.");
      return;
    }
    navigator.clipboard?.writeText(url).then(
      () => setDone("Copied the request."),
      () => setDone("Couldn't copy: select the line above."),
    );
  };

  const choice = (name: string, value: string, checked: boolean, onChange: () => void, text: string) => (
    <label key={value} className="relative cursor-pointer">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className="block rounded-[10px] px-3 py-1.5 text-[12px] transition-colors duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
        style={{
          fontFamily: MONO,
          border: `1px solid ${checked ? SHEET.paper : SHEET.line2}`,
          background: checked ? SHEET.paper : "transparent",
          color: checked ? SHEET.ground : SHEET.ink2,
          outlineColor: SHEET.signal,
        }}
      >
        {text}
      </span>
    </label>
  );

  return (
    <form onSubmit={submit} className={"da-scope w-full @container " + className} style={{ fontFamily: SANS, color: SHEET.ink, ...style }}>
      <style>{FOCUS_CSS + ".da-range{appearance:none;-webkit-appearance:none;background:transparent;height:28px}.da-range::-webkit-slider-runnable-track{height:2px;background:var(--da-track)}.da-range::-moz-range-track{height:2px;background:var(--da-track)}.da-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:18px;height:18px;margin-top:-8px;border-radius:0;background:#f3f0e6;border:0}.da-range::-moz-range-thumb{width:18px;height:18px;border-radius:0;background:#f3f0e6;border:0}"}</style>
      <div className="grid gap-5 @3xl:grid-cols-[1.3fr_1fr]">
        <label
          htmlFor={inputId}
          onDragOver={(e: ReactDragEvent<HTMLLabelElement>) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e: ReactDragEvent<HTMLLabelElement>) => {
            e.preventDefault();
            setOver(false);
            take(e.dataTransfer.files?.[0]);
          }}
          className="group relative block cursor-pointer overflow-hidden rounded-[18px] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2"
          style={{ border: `1px ${over ? "solid" : "dashed"} ${over ? SHEET.signal : SHEET.line2}`, outlineColor: SHEET.signal }}
        >
          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
            aria-describedby={hintId}
            className="sr-only"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              take(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <DitherLayer className="aspect-[16/10] w-full" cell={cell} ink={ink === "signal" ? SHEET.signal : SHEET.paper} level={level * exposure} duration={1100}>
            {pic ? (
              // eslint-disable-next-line @next/next/no-img-element -- pasted into any project: a plain img needs no next/image config
              <img src={safeSrc(pic.url)} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
            ) : (
              <DaStill kind="sphere" />
            )}
          </DitherLayer>
          <span
            className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 px-3 py-2 text-[12px]"
            style={{ background: "rgba(11,11,13,0.86)", border: `1px solid ${SHEET.line2}`, color: SHEET.ink }}
          >
            <span className="truncate">{pic ? pic.name : label}</span>
            <span className="shrink-0 text-[10.5px] uppercase" style={{ fontFamily: MONO, letterSpacing: "0.12em", color: SHEET.signal }}>
              {pic ? "Replace" : "Choose"}
            </span>
          </span>
        </label>
        <div className="flex flex-col gap-5">
          <p id={hintId} className="m-0 text-[13px] leading-[1.55]" style={{ color: SHEET.ink2 }}>
            {hint}
          </p>
          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 text-[11px] uppercase" style={{ fontFamily: MONO, letterSpacing: "0.14em", color: SHEET.ink3 }}>
              Cell
            </legend>
            <div className="flex flex-wrap gap-2">{[1, 2, 3].map((c) => choice(groupId + "-cell", String(c), cell === c, () => setCell(c), `${c}px`))}</div>
          </fieldset>
          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 text-[11px] uppercase" style={{ fontFamily: MONO, letterSpacing: "0.14em", color: SHEET.ink3 }}>
              Ink
            </legend>
            <div className="flex flex-wrap gap-2">
              {choice(groupId + "-ink", "paper", ink === "paper", () => setInk("paper"), "Paper")}
              {choice(groupId + "-ink", "signal", ink === "signal", () => setInk("signal"), "Signal")}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1">
            <label htmlFor={expId} className="flex items-baseline justify-between text-[11px] uppercase" style={{ fontFamily: MONO, letterSpacing: "0.14em", color: SHEET.ink3 }}>
              Exposure <span style={{ color: SHEET.ink2 }}>{exposure.toFixed(2)}</span>
            </label>
            <input
              id={expId}
              type="range"
              min={50}
              max={160}
              value={Math.round(exposure * 100)}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setExposure(Number(e.target.value) / 100)}
              className="da-range w-full"
              style={{ ["--da-track" as string]: SHEET.line2 } as CSSProperties}
            />
          </div>
          <output className="block break-all rounded-[10px] px-3 py-2.5 text-[11.5px] leading-[1.5]" style={{ fontFamily: MONO, background: SHEET.panel, border: `1px solid ${SHEET.line}`, color: SHEET.ink2 }}>
            <span style={{ color: SHEET.signal }}>GET </span>
            {url}
          </output>
          <div className="flex flex-wrap items-center gap-3">
            <BayerFillButton type="submit" variant="signal" size="md">
              Copy the request
            </BayerFillButton>
            <span role="status" className="text-[12px]" style={{ color: SHEET.ink2 }}>
              {done}
            </span>
          </div>
          {err ? (
            <p role="alert" className="m-0 text-[12.5px]" style={{ color: SHEET.signal }}>
              {err}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
