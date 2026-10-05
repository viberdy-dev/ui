"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

/**
 * OrbitLightButton — a dark pill whose border carries one light.
 *
 * Idle, the light laps the outline slowly (or waits, with idle="still").
 * Under the pointer it glides the short way round to the nearest point of
 * the border and lights the surface from there. Keyboard focus brings it
 * to the top edge, and a press sends a ring outward. Renders a link when
 * given an href, else a button. Measured in layout pixels, so it stays
 * exact inside scaled containers.
 *
 * Part of the Dark Precision kit: OLED black, 1px hairlines, one cool accent
 * used only as light (default #4fd1ff; also mint, amber, white or any
 * #rrggbb). Fonts come from CSS variables with Geist fallbacks. Respects
 * prefers-reduced-motion. No dependencies beyond React.
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const INK = "rgba(255,255,255,0.92)";

const LINE_2 = "rgba(255,255,255,0.14)";

const MORPH = "cubic-bezier(0.16, 1, 0.3, 1)";

const HEX = /^#[0-9a-fA-F]{6}$/;

export const DP_ACCENTS = {
  ice: "#4fd1ff",
  mint: "#5ef2c1",
  amber: "#ffb45e",
  white: "#f2f4f7",
} as const;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** A named accent or a #rrggbb hex; anything else falls back to ice. */
function accentHex(value: string): string {
  if (own(DP_ACCENTS, value)) return DP_ACCENTS[value];
  return HEX.test(value) ? value : DP_ACCENTS.ice;
}

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
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
const MOTION_CSS = "@media (prefers-reduced-motion: reduce){.dp-motion{animation:none!important}}";

// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".dp-scope :focus-visible,.dp-scope:focus-visible{outline:2px solid var(--dp-accent);outline-offset:3px;border-radius:revert-layer}";

const RING_CSS = "@keyframes dp-ring{from{box-shadow:0 0 0 0 rgb(var(--dp-accent-rgb) / 0.55)}to{box-shadow:0 0 0 16px rgb(var(--dp-accent-rgb) / 0)}}";

/** The accent as the CSS variables the focus ring and the keyframes read. */
function accentVars(hex: string): CSSProperties {
  const [r, g, b] = rgbOf(hex);
  return { "--dp-accent": hex, "--dp-accent-rgb": `${r} ${g} ${b}` } as CSSProperties;
}

/** A point on a pill's outline at distance s along it, starting at the top-left of the top edge, clockwise. */
function pillPoint(s: number, W: number, H: number) {
  const r = H / 2;
  const S = Math.max(0, W - H);
  const half = Math.PI * r;
  if (s < S) return { x: r + s, y: 0 };
  s -= S;
  if (s < half) {
    const a = -Math.PI / 2 + s / r;
    return { x: W - r + r * Math.cos(a), y: r + r * Math.sin(a) };
  }
  s -= half;
  if (s < S) return { x: W - r - s, y: H };
  s -= S;
  const a = Math.PI / 2 + s / r;
  return { x: r + r * Math.cos(a), y: r + r * Math.sin(a) };
}

/** The distance along a pill's outline nearest to a point inside or around it. */
function pillDistance(x: number, y: number, W: number, H: number) {
  const r = H / 2;
  const S = Math.max(0, W - H);
  const half = Math.PI * r;
  if (x >= r && x <= W - r) return y < r ? x - r : S + half + (W - r - x);
  if (x > W - r) {
    const a = Math.atan2(y - r, x - (W - r));
    return S + (a + Math.PI / 2) * r;
  }
  let a = Math.atan2(y - r, x - r);
  if (a < 0) a += 2 * Math.PI;
  return 2 * S + half + (a - Math.PI / 2) * r;
}

export type OrbitLightButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  accent?: string;
  size?: "md" | "lg";
  /** "orbit": the light laps the border when idle; "still": it waits for the pointer. */
  idle?: "orbit" | "still";
  /** Seconds per lap when idle. */
  lap?: number;
  type?: "button" | "submit";
  className?: string;
};

/**
 * A dark pill whose border carries one light. Idle, it laps the outline
 * slowly; under the pointer it glides to the nearest point of the border and
 * lights the surface from there; a press sends a ring outward. Keyboard focus
 * brings the light to the top edge.
 */
export function OrbitLightButton({ children, href, onClick, accent = "ice", size = "lg", idle = "orbit", lap = 32, type = "button", className }: OrbitLightButtonProps) {
  const acc = accentHex(accent);
  const reduced = useReducedMotion();
  const hostRef = useRef<HTMLElement | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [rings, setRings] = useState(0);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    const svg = svgRef.current;
    if (!el || !svg || !box.w || !box.h) return;
    const W = box.w - 1;
    const H = box.h - 1;
    const P = 2 * Math.max(0, W - H) + Math.PI * H;
    const dashes = Array.from(svg.querySelectorAll<SVGRectElement>("rect[data-dash]"));
    let t = 0.1;
    let target = -1;
    let hover = false;
    let raf = 0;
    let last = 0;
    let running = false;
    let visible = true;
    const orbiting = () => idle === "orbit" && !reduced && lap > 0;
    const place = () => {
      for (const d of dashes) {
        const L = Number(d.dataset.dash) * P;
        d.style.strokeDasharray = L + " " + (P - L);
        d.style.strokeDashoffset = String(L / 2 - t * P);
      }
      const p = pillPoint(t * P, W, H);
      el.style.setProperty("--ox", (p.x + 0.5).toFixed(1) + "px");
      el.style.setProperty("--oy", (p.y + 0.5).toFixed(1) + "px");
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      let settled = true;
      if (target >= 0) {
        let d = target - t;
        d -= Math.round(d);
        if (reduced) t = target;
        else t += d * (1 - Math.exp(-dt * 9));
        settled = Math.abs(d) < 0.0005;
      } else if (orbiting()) {
        t += dt / lap;
        settled = false;
      }
      t = ((t % 1) + 1) % 1;
      place();
      if (visible && !settled) raf = requestAnimationFrame(tick);
      else {
        running = false;
        last = 0;
      }
    };
    const kick = () => {
      if (running || !visible) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) * el.offsetWidth) / (r.width || 1);
      const y = ((e.clientY - r.top) * el.offsetHeight) / (r.height || 1);
      target = pillDistance(x, y, W, H) / P;
      hover = true;
      el.style.setProperty("--lit", "1");
      kick();
    };
    const onLeave = () => {
      hover = false;
      target = -1;
      el.style.setProperty("--lit", idle === "orbit" ? "0.7" : "0");
      kick();
    };
    const onFocus = () => {
      if (!el.matches(":focus-visible")) return;
      target = 0.12;
      el.style.setProperty("--lit", "1");
      kick();
    };
    const onBlur = () => {
      if (!hover) onLeave();
    };
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) kick();
    });
    io.observe(el);
    el.style.setProperty("--lit", idle === "orbit" ? "0.7" : "0");
    place();
    kick();
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
    };
  }, [box.w, box.h, idle, lap, reduced]);

  const press = () => setRings((n) => n + 1);
  const h = size === "lg" ? 48 : 40;
  const cls =
    "dp-scope group/orbit relative inline-flex select-none items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] transition-transform duration-150 active:scale-[0.985] " +
    (size === "lg" ? "px-6 text-[15px]" : "px-5 text-[14px]") +
    (className ? " " + className : "");
  const style: CSSProperties = {
    ...accentVars(acc),
    height: h,
    color: INK,
    background: `radial-gradient(90px circle at var(--ox, 20%) var(--oy, 0%), ${rgba(acc, 0.2)}, transparent 70%), linear-gradient(180deg, #16161a, #0c0c0f)`,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
    fontFamily: SANS,
    WebkitTapHighlightColor: "transparent",
  };
  const inner = (
    <>
      <svg ref={svgRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width={box.w || 1} height={box.h || 1}>
        {box.w > 0 && (
          <>
            <rect x="0.5" y="0.5" width={box.w - 1} height={box.h - 1} rx={(box.h - 1) / 2} fill="none" stroke={LINE_2} />
            <g style={{ opacity: "var(--lit, 0.7)", transition: "opacity 280ms ease" }}>
              <rect data-dash="0.24" x="0.5" y="0.5" width={box.w - 1} height={box.h - 1} rx={(box.h - 1) / 2} fill="none" stroke={acc} strokeWidth="5" strokeLinecap="round" style={{ opacity: 0.32, filter: "blur(3px)" }} />
              <rect data-dash="0.14" x="0.5" y="0.5" width={box.w - 1} height={box.h - 1} rx={(box.h - 1) / 2} fill="none" stroke={acc} strokeWidth="1.25" strokeLinecap="round" />
              <rect data-dash="0.035" x="0.5" y="0.5" width={box.w - 1} height={box.h - 1} rx={(box.h - 1) / 2} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </>
        )}
      </svg>
      {rings > 0 && !reduced && <span key={rings} aria-hidden className="dp-motion pointer-events-none absolute inset-0 rounded-full" style={{ animation: `dp-ring 700ms ${MORPH} both` }} />}
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="transition-transform duration-200 group-hover/orbit:translate-x-0.5">
          <path d="M2.5 7h8.5M7.5 3.5 11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </>
  );
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") press();
  };
  if (href) {
    return (
      <>
        <style>{FOCUS_CSS + RING_CSS + MOTION_CSS}</style>
        <a ref={(n) => { hostRef.current = n; }} href={safeHref(href)} onClick={onClick} onPointerDown={press} onKeyDown={onKeyDown} className={cls} style={style}>
          {inner}
        </a>
      </>
    );
  }
  return (
    <>
      <style>{FOCUS_CSS + RING_CSS + MOTION_CSS}</style>
      <button ref={(n) => { hostRef.current = n; }} type={type} onClick={onClick} onPointerDown={press} onKeyDown={onKeyDown} className={cls} style={style}>
        {inner}
      </button>
    </>
  );
}
