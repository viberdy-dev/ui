"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";

/**
 * AsciiDensityNav — a nav whose active link is marked by a band of ASCII density.
 *
 * Under the links runs a line of mono characters that thicken through a
 * ramp (. · : - = + * # % @) around the active link, densest under its
 * centre; choose another and the band flows there on a spring, its peak in
 * signal, and hover raises a smaller swell. Drawn a frame at a time only
 * while something moves. Controlled or not; folds into a menu when narrow.
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

const DISPLAY = 'var(--font-funnel, "Funnel Display", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

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

/** A spring for one number; returns the new value and velocity. */
function spring(x: number, v: number, target: number, dt: number, k = 260, c = 26): [number, number] {
  const steps = dt > 1 / 60 ? 2 : 1;
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    v += (k * (target - x) - c * v) * h;
    x += v * h;
  }
  return [x, v];
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

export type DaLink = { label: string; href: string };

/** From empty to full: the ramp the density band is set in. */
const DA_RAMP = " .·:-=+*#%@";

/**
 * AsciiDensityNav — a nav whose active link is marked by a band of ASCII
 * density that flows between links.
 *
 * Under the links runs a line of mono characters. Around the active link
 * the characters thicken through a ramp (. · : - = + * # % @), densest
 * under its centre, and when another link is chosen the band flows there on
 * a spring, its peak in signal; hovering or focusing a link raises a smaller
 * swell under it. The characters are real text drawn a frame at a time only
 * while something moves. Controlled or not; folds into a menu on narrow
 * containers.
 */
export function AsciiDensityNav({
  brand = "Dotplane",
  links,
  cta,
  active,
  defaultActive,
  onNavigate,
  className = "",
  style,
}: {
  brand?: string;
  links: DaLink[];
  cta?: DaLink | null;
  /** The active link's href, controlled. */
  active?: string;
  defaultActive?: string;
  onNavigate?: (href: string) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const [own, setOwn] = useState(defaultActive ?? links[0]?.href ?? "");
  const current = active ?? own;
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const reduced = useReducedMotion();
  const rowRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLSpanElement>(null);
  const hotRef = useRef<HTMLSpanElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const band = useRef({ x: -1, v: 0, w: 60, hx: -1, hw: 0, ha: 0, raf: 0, last: 0, chars: 0, cw: 7.2 });
  const [hover, setHover] = useState(-1);
  const idx = Math.max(0, links.findIndex((l) => l.href === current));

  // Draws the band: each character's density is a Gaussian around the active link, plus the hover swell.
  useEffect(() => {
    const row = rowRef.current;
    const base = baseRef.current;
    const hot = hotRef.current;
    if (!row || !base || !hot) return;
    const b = band.current;
    const target = () => {
      const a = linkRefs.current[idx];
      const h = hover >= 0 ? linkRefs.current[hover] : null;
      const r0 = row.getBoundingClientRect();
      const k = row.offsetWidth ? r0.width / row.offsetWidth : 1;
      const at = (el: HTMLElement | null) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: (r.left - r0.left + r.width / 2) / k, w: r.width / k };
      };
      return { a: at(a), h: at(h) };
    };
    const draw = () => {
      let s = "";
      let peak = "";
      for (let i = 0; i < b.chars; i++) {
        const x = (i + 0.5) * b.cw;
        const da = (x - b.x) / (b.w * 0.42);
        const dh = (x - b.hx) / Math.max(1, b.hw * 0.3);
        const v = Math.min(1, 0.06 + Math.exp(-da * da) + b.ha * 0.55 * Math.exp(-dh * dh));
        const c = DA_RAMP[Math.min(DA_RAMP.length - 1, Math.floor(v * (DA_RAMP.length - 0.01)))];
        s += c;
        peak += v > 0.86 ? c : " ";
      }
      base.textContent = s;
      hot.textContent = peak;
    };
    const tick = (now: number) => {
      b.raf = 0;
      const dt = b.last ? Math.min(0.05, (now - b.last) / 1000) : 1 / 60;
      b.last = now;
      const t = target();
      let busy = false;
      if (t.a) {
        if (b.x < 0 || reduced) {
          b.x = t.a.x;
          b.w = t.a.w;
        } else {
          [b.x, b.v] = spring(b.x, b.v, t.a.x, dt, 170, 22);
          b.w += (t.a.w - b.w) * (1 - Math.exp(-dt * 10));
          busy = Math.abs(t.a.x - b.x) > 0.3 || Math.abs(b.v) > 0.5;
        }
      }
      const want = t.h ? 1 : 0;
      if (t.h) {
        b.hx = t.h.x;
        b.hw = t.h.w;
      }
      b.ha = reduced ? want : b.ha + (want - b.ha) * (1 - Math.exp(-dt * 12));
      if (Math.abs(want - b.ha) > 0.01) busy = true;
      draw();
      if (busy) b.raf = requestAnimationFrame(tick);
      else b.last = 0;
    };
    const measure = () => {
      const probe = document.createElement("span");
      probe.textContent = "0000000000";
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font:inherit;letter-spacing:inherit";
      base.parentElement?.appendChild(probe);
      b.cw = probe.getBoundingClientRect().width / 10 / (row.offsetWidth ? row.getBoundingClientRect().width / row.offsetWidth : 1) || 7.2;
      probe.remove();
      b.chars = Math.max(0, Math.floor(row.offsetWidth / b.cw));
      if (!b.raf) b.raf = requestAnimationFrame(tick);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    if (!b.raf) b.raf = requestAnimationFrame(tick);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(b.raf);
      b.raf = 0;
    };
  }, [idx, hover, reduced, links.length]);

  // The menu closes on Escape (focus back to its button) and on a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !menuBtn.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const go = (href: string) => {
    if (active === undefined) setOwn(href);
    onNavigate?.(href);
    setOpen(false);
  };

  return (
    <header className={"da-scope relative w-full @container " + className} style={{ fontFamily: SANS, color: SHEET.ink, ...style }}>
      <style>{FOCUS_CSS}</style>
      <nav
        aria-label="Main"
        className="flex h-16 items-center gap-6 px-5 @3xl:px-8"
        style={{ background: "rgba(11,11,13,0.82)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${SHEET.line}` }}
      >
        <a href={safeHref(links[0]?.href ?? "#")} className="flex shrink-0 items-center gap-2.5 no-underline" style={{ color: SHEET.paper }} onClick={() => go(links[0]?.href ?? "#")}>
          <span aria-hidden className="grid h-[18px] w-[18px] grid-cols-3 gap-[2px]">
            {[1, 0, 1, 0, 1, 0, 1, 0, 1].map((on, i) => (
              <span key={i} style={{ background: on ? (i === 4 ? SHEET.signal : SHEET.paper) : "transparent" }} />
            ))}
          </span>
          <span className="text-[16px] font-semibold" style={{ fontFamily: DISPLAY, letterSpacing: "-0.02em" }}>
            {brand}
          </span>
        </a>
        <div ref={rowRef} className="relative mx-auto hidden h-full min-w-0 flex-1 @3xl:block">
          <ul className="m-0 flex h-full list-none items-center justify-center gap-1 p-0">
            {links.map((l, i) => (
              <li key={l.href}>
                <a
                  ref={(el) => void (linkRefs.current[i] = el)}
                  href={safeHref(l.href)}
                  aria-current={l.href === current ? "page" : undefined}
                  onClick={() => go(l.href)}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(-1)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(-1)}
                  className="relative block rounded-[8px] px-3.5 py-2 text-[13.5px] no-underline transition-colors duration-200"
                  style={{ color: l.href === current ? SHEET.paper : SHEET.ink2 }}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-[7px] block overflow-hidden whitespace-pre text-[11px] leading-none"
            style={{ fontFamily: MONO, letterSpacing: "0.04em", color: SHEET.ink3 }}
          >
            <span ref={baseRef} className="block" />
            <span ref={hotRef} className="absolute inset-0 block" style={{ color: SHEET.signal }} />
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 @3xl:ml-0">
          {cta ? (
            <BayerFillButton href={cta.href} size="md" variant="paper" onClick={() => go(cta.href)}>
              {cta.label}
            </BayerFillButton>
          ) : null}
          <button
            ref={menuBtn}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-[10px] @3xl:hidden"
            style={{ border: `1px solid ${SHEET.line2}`, background: "transparent", color: SHEET.paper }}
          >
            <span className="sr-only">Menu</span>
            <span aria-hidden className="text-[13px]" style={{ fontFamily: MONO }}>
              {open ? "×" : "≡"}
            </span>
          </button>
        </div>
      </nav>
      {open ? (
        <div ref={panelRef} id={menuId} className="absolute inset-x-3 top-[68px] z-20 rounded-[14px] p-2 @3xl:hidden" style={{ background: SHEET.panel, border: `1px solid ${SHEET.line2}` }}>
          <ul className="m-0 list-none p-0">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={safeHref(l.href)}
                  aria-current={l.href === current ? "page" : undefined}
                  onClick={() => go(l.href)}
                  className="flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[15px] no-underline"
                  style={{ color: l.href === current ? SHEET.paper : SHEET.ink2 }}
                >
                  {l.label}
                  <span aria-hidden className="text-[11px]" style={{ fontFamily: MONO, color: l.href === current ? SHEET.signal : SHEET.ink3 }}>
                    {l.href === current ? "#%@" : ".:-"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
