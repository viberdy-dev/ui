"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { CSSProperties, RefObject } from "react";

/**
 * BeamConnector — a beam of light between any two elements.
 *
 * Draws a hairline between two elements inside a relatively positioned
 * container, routed with rounded right-angle elbows, and sends a pulse of
 * light along it once per cycle that lands with a flash at the far end.
 * Ends are refs or CSS selectors resolved inside the container; stagger
 * several beams with delay to show a request travelling through a system.
 * It measures in layout pixels and re-routes on resize.
 *
 * Part of the Dark Precision kit: OLED black, 1px hairlines, one cool accent
 * used only as light (default #4fd1ff; also mint, amber, white or any
 * #rrggbb). Fonts come from CSS variables with Geist fallbacks. Respects
 * prefers-reduced-motion. No dependencies beyond React.
 */

const LINE_2 = "rgba(255,255,255,0.14)";

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

const PULSE_CSS =
  "@keyframes dp-pulse{0%{stroke-dashoffset:var(--d)}30%,100%{stroke-dashoffset:calc(var(--d) - var(--len) - var(--dmax))}}" +
  "@keyframes dp-arrive{0%,27%{opacity:0;transform:scale(.5)}31%{opacity:1;transform:scale(1)}62%,100%{opacity:0;transform:scale(1.9)}}" +
  "@keyframes dp-lit{0%,27%{opacity:0}32%{opacity:1}70%,100%{opacity:0}}";

type Pt = { x: number; y: number };

export type BeamSide = "left" | "right" | "top" | "bottom";

function portOf(b: { x: number; y: number; w: number; h: number }, side: BeamSide): Pt {
  if (side === "left") return { x: b.x, y: b.y + b.h / 2 };
  if (side === "right") return { x: b.x + b.w, y: b.y + b.h / 2 };
  if (side === "top") return { x: b.x + b.w / 2, y: b.y };
  return { x: b.x + b.w / 2, y: b.y + b.h };
}

/** Orthogonal route between two ports with rounded elbows; returns the SVG path and its exact length. */
function elbowPath(a: Pt, b: Pt, from: BeamSide, to: BeamSide, lane: number, radius: number) {
  const hA = from === "left" || from === "right";
  const hB = to === "left" || to === "right";
  let pts: Pt[];
  if (hA && hB) {
    const mx = a.x + (b.x - a.x) * lane;
    pts = [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b];
  } else if (!hA && !hB) {
    const my = a.y + (b.y - a.y) * lane;
    pts = [a, { x: a.x, y: my }, { x: b.x, y: my }, b];
  } else if (hA) pts = [a, { x: b.x, y: a.y }, b];
  else pts = [a, { x: a.x, y: b.y }, b];
  const clean: Pt[] = [];
  for (const p of pts) {
    const q = clean[clean.length - 1];
    if (!q || Math.abs(q.x - p.x) > 0.5 || Math.abs(q.y - p.y) > 0.5) clean.push(p);
  }
  let d = `M${clean[0].x.toFixed(1)} ${clean[0].y.toFixed(1)}`;
  let len = 0;
  let cur = clean[0];
  for (let i = 1; i < clean.length; i++) {
    const v = clean[i];
    const n = clean[i + 1];
    if (!n) {
      len += Math.hypot(v.x - cur.x, v.y - cur.y);
      d += ` L${v.x.toFixed(1)} ${v.y.toFixed(1)}`;
      break;
    }
    const l1 = Math.hypot(v.x - cur.x, v.y - cur.y);
    const l2 = Math.hypot(n.x - v.x, n.y - v.y);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    const p1 = { x: v.x - ((v.x - cur.x) / (l1 || 1)) * r, y: v.y - ((v.y - cur.y) / (l1 || 1)) * r };
    const p2 = { x: v.x + ((n.x - v.x) / (l2 || 1)) * r, y: v.y + ((n.y - v.y) / (l2 || 1)) * r };
    const cross = (v.x - cur.x) * (n.y - v.y) - (v.y - cur.y) * (n.x - v.x);
    len += Math.hypot(p1.x - cur.x, p1.y - cur.y) + (Math.PI / 2) * r;
    d += ` L${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 ${cross > 0 ? 1 : 0} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    cur = p2;
  }
  return { d, len, end: clean[clean.length - 1] };
}

export type BeamConnectorProps = {
  containerRef: RefObject<HTMLElement | null>;
  /** The start: a ref, or a CSS selector resolved inside the container. */
  from: RefObject<HTMLElement | null> | string;
  /** The end: a ref, or a CSS selector resolved inside the container. */
  to: RefObject<HTMLElement | null> | string;
  fromSide?: BeamSide;
  toSide?: BeamSide;
  accent?: string;
  /** Seconds per cycle; the pulse travels during the first 30% of it. */
  duration?: number;
  delay?: number;
  /** Where the elbow sits between the two ports, 0 to 1. */
  lane?: number;
  radius?: number;
  /** Pulses run only while true (for example, once the section is in view). */
  active?: boolean;
};

/**
 * A hairline beam between any two elements in a container, routed with
 * rounded right-angle elbows. A pulse of light travels it once per cycle and
 * lands with a flash at the far end. Put it inside a relatively positioned
 * container; it measures in layout pixels, so scaled previews stay aligned.
 */
export function BeamConnector({ containerRef, from, to, fromSide = "right", toSide = "left", accent = "ice", duration = 9, delay = 0, lane = 0.5, radius = 12, active = true }: BeamConnectorProps) {
  const acc = accentHex(accent);
  const reduced = useReducedMotion();
  const [geo, setGeo] = useState<{ d: string; len: number; end: Pt; w: number; h: number } | null>(null);
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const pick = (x: RefObject<HTMLElement | null> | string) => (typeof x === "string" ? c.querySelector<HTMLElement>(x) : x.current);
    const a = pick(from);
    const b = pick(to);
    if (!a || !b) return;
    const measure = () => {
      const cr = c.getBoundingClientRect();
      const k = c.offsetWidth / (cr.width || 1);
      const box = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return { x: (r.left - cr.left) * k, y: (r.top - cr.top) * k, w: r.width * k, h: r.height * k };
      };
      const p = elbowPath(portOf(box(a), fromSide), portOf(box(b), toSide), fromSide, toSide, lane, radius);
      setGeo({ ...p, w: c.offsetWidth, h: c.offsetHeight });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(c);
    ro.observe(a);
    ro.observe(b);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, from, to, fromSide, toSide, lane, radius]);
  if (!geo) return null;
  const run = active && !reduced;
  const timing = { animationDuration: duration + "s", animationDelay: delay + "s", animationIterationCount: "infinite", animationTimingFunction: "linear" };
  const dash = (d: number): CSSProperties =>
    ({ "--d": d + "px", "--len": geo.len.toFixed(1) + "px", "--dmax": "96px", strokeDasharray: `${d} ${geo.len + 200}`, strokeDashoffset: d, animationName: "dp-pulse", ...timing }) as CSSProperties;
  return (
    <svg aria-hidden className="pointer-events-none absolute left-0 top-0 overflow-visible" width={geo.w} height={geo.h}>
      <style>{PULSE_CSS + MOTION_CSS}</style>
      <path d={geo.d} fill="none" stroke={LINE_2} strokeWidth={1} />
      {run && (
        <>
          <path className="dp-motion" d={geo.d} fill="none" stroke={acc} strokeWidth={5} strokeLinecap="round" style={{ ...dash(96), opacity: 0.28, filter: "blur(3px)" }} />
          <path className="dp-motion" d={geo.d} fill="none" stroke={acc} strokeWidth={1.25} strokeLinecap="round" style={dash(56)} />
          <path className="dp-motion" d={geo.d} fill="none" stroke="#ffffff" strokeWidth={1.5} strokeLinecap="round" style={dash(10)} />
          <circle
            className="dp-motion"
            cx={geo.end.x}
            cy={geo.end.y}
            r={5}
            fill={acc}
            style={{ transformBox: "fill-box", transformOrigin: "center", opacity: 0, filter: `drop-shadow(0 0 6px ${acc})`, animationName: "dp-arrive", ...timing }}
          />
        </>
      )}
    </svg>
  );
}
