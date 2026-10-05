"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";

/**
 * BayerFillButton — a button whose fill prints in, cell by cell.
 *
 * Hover or focus it and the fill develops through the 8x8 Bayer order to
 * solid in about 260ms (and back out in 360ms); the label inverts exactly
 * where each cell lands, because the inverted label lives inside the masked
 * fill. Press it and the screen halves to a finer grid. Signal, paper and
 * ghost inks; `lit` holds it filled for a chosen option. CSS masks and a
 * small animation loop, no canvas.
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
