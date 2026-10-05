"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";

/**
 * MercuryPourNav — a floating nav whose indicator is a capsule of mercury.
 *
 * The capsule moves on two springs, one per edge: the edge in the
 * direction of travel is stiff, the trailing edge soft, so it stretches
 * thin as it pours to the next link and snaps back round. Hovering or
 * focusing another link makes it reach a quarter of the way. The chrome it
 * reflects slides with its speed, and the labels it covers turn dark,
 * clipped to it exactly. Pass `active` (for example from scroll position,
 * -1 for none) or let clicks set it.
 *
 * Part of the Liquid Chrome kit: a graphite room, a four-band chrome ramp
 * (#08090b, #4b4f58, #c9ced6, #ffffff) multiplied by a finish (chrome, gold,
 * rose, cobalt or any #rrggbb), foil colour only as a thin film. Fonts come
 * from CSS variables with Archivo and Geist fallbacks. Respects
 * prefers-reduced-motion. No dependencies beyond React. Paste it as its own
 * file: it repeats the kit's small helpers, which would clash in one module.
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const DISPLAY = 'var(--font-display, "Archivo", "Helvetica Neue", Arial, sans-serif)';

const INK = "rgba(244,245,247,0.94)";

const INK_2 = "rgba(244,245,247,0.62)";

const LINE_2 = "rgba(255,255,255,0.16)";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The reflected room, darkest to hottest. Every chrome surface in the kit reflects these four bands. */
const RAMP = ["#08090b", "#4b4f58", "#c9ced6", "#ffffff"] as const;

/** Metal finishes: the colour the room is multiplied by. */
export const LC_FINISHES = {
  chrome: "#ffffff",
  gold: "#f2cf92",
  rose: "#f1bcb4",
  cobalt: "#b9cbff",
} as const;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** A named finish or a #rrggbb tint; anything else falls back to chrome. */
function finishHex(value: string): string {
  if (own(LC_FINISHES, value)) return LC_FINISHES[value];
  return HEX.test(value) ? value : LC_FINISHES.chrome;
}

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A ramp colour multiplied by the finish, as rgb(). */
function tinted(hex: string, tint: string): string {
  const a = rgbOf(hex);
  const b = rgbOf(tint);
  return `rgb(${Math.round((a[0] * b[0]) / 255)} ${Math.round((a[1] * b[1]) / 255)} ${Math.round((a[2] * b[2]) / 255)})`;
}

/** The finished ramp as the CSS variables every chrome gradient and the focus ring read. */
function finishVars(tint: string): CSSProperties {
  return {
    "--lc-0": tinted(RAMP[0], tint),
    "--lc-1": tinted(RAMP[1], tint),
    "--lc-2": tinted(RAMP[2], tint),
    "--lc-3": tinted(RAMP[3], tint),
  } as CSSProperties;
}

/**
 * Chrome as a CSS gradient: bright sky, a hard dark horizon, a lit floor.
 * `--lc-h` moves the horizon (0-100), so a surface can turn in the room.
 */
const CHROME_BG =
  "linear-gradient(180deg, var(--lc-3) 0%, var(--lc-2) calc(var(--lc-h, 50) * 1% - 16%), var(--lc-1) calc(var(--lc-h, 50) * 1% - 2%), var(--lc-0) calc(var(--lc-h, 50) * 1%), var(--lc-1) calc(var(--lc-h, 50) * 1% + 14%), var(--lc-2) calc(var(--lc-h, 50) * 1% + 34%), var(--lc-3) 100%)";

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
const FOCUS_CSS = ".lc-scope :focus-visible,.lc-scope:focus-visible{outline:2px solid var(--lc-2);outline-offset:3px;border-radius:revert-layer}";

export type LcLink = { label: string; href: string };

export type MercuryPourNavProps = {
  brand: string;
  links: LcLink[];
  /** The current link (controlled, e.g. by scroll position; -1 for none); clicks set it when uncontrolled. */
  active?: number;
  onSelect?: (index: number) => void;
  cta?: LcLink;
  finish?: string;
  className?: string;
};

/**
 * A floating nav whose current-link indicator is a capsule of mercury. It
 * moves on two springs, one per edge: the edge in the direction of travel is
 * stiff and the trailing edge is soft, so the capsule stretches thin as it
 * pours to the next link, then snaps back to its round length. Hovering or
 * focusing another link makes it reach toward it. The chrome it reflects
 * slides with its speed, and the labels it covers turn dark, clipped to it
 * exactly.
 */
export function MercuryPourNav({ brand, links, active, onSelect, cta, finish = "chrome", className }: MercuryPourNavProps) {
  const tint = finishHex(finish);
  const reduced = useReducedMotion();
  const [picked, setPicked] = useState(0);
  const current = active ?? picked;
  const [lean, setLean] = useState<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const darkRef = useRef<HTMLDivElement>(null);
  const spring = useRef({ l: 0, r: 0, vl: 0, vr: 0, ready: false });

  useEffect(() => {
    const row = rowRef.current;
    const cap = capRef.current;
    const dark = darkRef.current;
    if (!row || !cap || !dark) return;
    const items = Array.from(row.querySelectorAll<HTMLElement>("[data-lc-link]"));
    const box = (i: number) => {
      const el = items[Math.max(0, Math.min(items.length - 1, i))];
      return el ? { l: el.offsetLeft, r: el.offsetLeft + el.offsetWidth } : { l: 0, r: 0 };
    };
    const s = spring.current;
    let raf = 0;
    let last = 0;
    const target = () => {
      if (current < 0) {
        // Nothing current: the capsule gathers into a bead at the first link.
        const f = box(0);
        const mid = (f.l + f.r) / 2;
        return { l: mid, r: mid };
      }
      const a = box(current);
      if (lean === null || lean === current) return a;
      // Reach a quarter of the way toward the link under the pointer.
      const b = box(lean);
      return lean > current ? { l: a.l, r: a.r + (b.r - a.r) * 0.24 } : { l: a.l + (b.l - a.l) * 0.24, r: a.r };
    };
    const paint = () => {
      const w = Math.max(0, s.r - s.l);
      const rest = box(Math.max(0, current));
      const stretch = Math.max(0, w / Math.max(1, rest.r - rest.l) - 1);
      cap.style.transform = `translateX(${s.l}px) scaleY(${(1 - Math.min(0.28, stretch * 0.22)).toFixed(3)})`;
      cap.style.width = `${w}px`;
      cap.style.opacity = w < 6 ? "0" : "1";
      cap.style.setProperty("--lc-h", (64 + Math.max(-12, Math.min(12, (s.vl + s.vr) * 0.006))).toFixed(1));
      dark.style.clipPath = `inset(0 ${Math.max(0, row.offsetWidth - s.r)}px 0 ${s.l}px round 999px)`;
    };
    const step = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.032, (now - last) / 1000) : 0.016;
      last = now;
      const t = target();
      const right = t.r + t.l > s.r + s.l;
      // The leading edge is stiff, the trailing edge soft: the capsule stretches as it travels.
      const kl = right ? 170 : 520;
      const kr = right ? 520 : 170;
      s.vl += ((t.l - s.l) * kl - s.vl * 2 * Math.sqrt(kl) * 0.72) * dt;
      s.vr += ((t.r - s.r) * kr - s.vr * 2 * Math.sqrt(kr) * 0.72) * dt;
      s.l += s.vl * dt;
      s.r += s.vr * dt;
      paint();
      const moving = Math.abs(t.l - s.l) + Math.abs(t.r - s.r) + Math.abs(s.vl) * 0.01 + Math.abs(s.vr) * 0.01 > 0.1;
      if (moving) raf = requestAnimationFrame(step);
      else last = 0;
    };
    const t0 = target();
    if (!s.ready || reduced) {
      s.l = t0.l;
      s.r = t0.r;
      s.vl = s.vr = 0;
      s.ready = true;
      paint();
    } else raf = requestAnimationFrame(step);
    const ro = new ResizeObserver(() => {
      if (reduced) {
        const t = target();
        s.l = t.l;
        s.r = t.r;
        paint();
      } else if (!raf) raf = requestAnimationFrame(step);
    });
    ro.observe(row);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [current, lean, reduced, links.length]);

  const select = (i: number) => {
    if (active === undefined) setPicked(i);
    onSelect?.(i);
  };

  const labelCls = "relative z-[1] shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-medium";
  return (
    <nav
      aria-label="Main"
      className={"lc-scope relative flex h-[52px] items-center gap-2 rounded-full pl-5 pr-1.5" + (className ? " " + className : "")}
      style={{
        ...finishVars(tint),
        fontFamily: SANS,
        background: "rgba(20,21,25,0.72)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        backdropFilter: "blur(14px) saturate(140%)",
        boxShadow: `inset 0 0 0 1px ${LINE_2}, inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 40px -18px rgba(0,0,0,0.9)`,
      }}
    >
      <style>{FOCUS_CSS}</style>
      <span className="mr-2 shrink-0 text-[13px] uppercase tracking-[0.2em]" style={{ fontFamily: DISPLAY, fontWeight: 700, fontStretch: "125%", color: INK }}>
        {brand}
      </span>
      <div className="relative min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div ref={rowRef} className="relative flex w-max items-center" onPointerLeave={() => setLean(null)}>
          <div
            ref={capRef}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 rounded-full"
            style={{
              width: 0,
              background: `radial-gradient(40% 80% at 30% 0%, rgba(255,255,255,0.9), rgba(255,255,255,0) 70%), ${CHROME_BG}`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 1px rgba(0,0,0,0.45), 0 6px 16px -6px rgba(0,0,0,0.9)",
              transformOrigin: "50% 50%",
              opacity: 0,
              transition: "opacity 200ms ease",
            }}
          />
          {links.map((l, i) => (
            <a
              key={l.label}
              data-lc-link
              href={safeHref(l.href)}
              aria-current={i === current ? "true" : undefined}
              onClick={() => select(i)}
              onPointerEnter={() => setLean(i)}
              onFocus={() => setLean(i)}
              onBlur={() => setLean(null)}
              className={labelCls + " transition-colors hover:text-white"}
              style={{ color: INK_2 }}
            >
              {l.label}
            </a>
          ))}
          {/* The labels again in dark ink, clipped to the capsule. */}
          <div ref={darkRef} aria-hidden className="pointer-events-none absolute inset-0 z-[2] flex items-center">
            {links.map((l) => (
              <span key={l.label} className={labelCls} style={{ color: "rgba(12,13,16,0.92)", textShadow: "0 1px 0 rgba(255,255,255,0.45)" }}>
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      {cta && (
        <a
          href={safeHref(cta.href)}
          className="ml-auto shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition-colors hover:text-white"
          style={{ color: INK, boxShadow: `inset 0 0 0 1px ${LINE_2}` }}
        >
          {cta.label}
        </a>
      )}
    </nav>
  );
}
