"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

/**
 * LightLiftCard — a card that lifts toward the pointer, with shadows that behave like light.
 *
 * It tilts at most two degrees toward the pointer and lifts, and its two
 * shadows (a tight contact and a wide ambient, from one light above) move
 * the way a real card's would: the ambient widens and drifts away from the
 * side that rose. A faint paper sheen follows the pointer and the hairline
 * brightens. On it, a plate of light at a colour temperature. CSS only.
 *
 * Part of the Modern Minimal kit: a paper-white room (#f5f5f2, surfaces
 * #ffffff, ink #141412) and one light, dawn #ffa64d, only ever as light.
 * Two-layer shadows from one light above; scroll binds values directly,
 * with no easing. Inter Tight through var(--font-inter-tight) for display
 * over Geist. Respects prefers-reduced-motion. No dependencies beyond React.
 * Paste it as its own file: it repeats the kit's small helpers, which would
 * clash in one module. Load Inter Tight with next/font (variable:
 * "--font-inter-tight") on a parent, or from Google Fonts or @fontsource.
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

const DISPLAY = 'var(--font-inter-tight, "Inter Tight", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** A paper-white room and one light. */
const PAPER = {
  ground: "#f5f5f2",
  surface: "#ffffff",
  well: "#ecebe6",
  solid: "#141412",
  ink: "rgba(20,20,18,0.92)",
  ink2: "rgba(20,20,18,0.6)",
  ink3: "rgba(20,20,18,0.38)",
  line: "rgba(20,20,18,0.08)",
  line2: "rgba(20,20,18,0.14)",
  dawn: "#ffa64d",
  night: "#0e0f11",
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
// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".mm-scope :focus-visible,.mm-scope:focus-visible{outline:2px solid var(--mm-ring,#141412)!important;outline-offset:3px;border-radius:revert-layer}";

/** A colour temperature as a CSS colour (sRGB), for swatches of light. */
function mmKelvinCss(k: number, alpha = 1): string {
  const t = clamp(k, 1000, 12000) / 100;
  const r = t <= 66 ? 255 : clamp(329.7 * Math.pow(t - 60, -0.1332), 0, 255);
  const g = t <= 66 ? clamp(99.47 * Math.log(t) - 161.12, 0, 255) : clamp(288.12 * Math.pow(t - 60, -0.0755), 0, 255);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : clamp(138.52 * Math.log(t - 10) - 305.04, 0, 255);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

/** A small plate of light at a colour temperature: the kit's code-drawn stand-in for a product shot. */
function MmLightPlate({ kelvin = 3000, glow = 1, className = "" }: { kelvin?: number; glow?: number; className?: string }) {
  const c = mmKelvinCss(kelvin, 0.9 * glow);
  const soft = mmKelvinCss(kelvin, 0.28 * glow);
  return (
    <div aria-hidden className={"relative overflow-hidden " + className} style={{ background: `radial-gradient(120% 90% at 50% 38%, ${soft}, transparent 62%), linear-gradient(180deg, #f0efea 0%, #f7f6f2 62%, #e9e8e2 62.2%, #f1f0eb 100%)` }}>
      <div className="absolute left-1/2 top-[38%] aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: `radial-gradient(circle at 50% 44%, #fffaf2 0%, ${c} 58%, ${mmKelvinCss(kelvin, 0.55 * glow)} 100%)`, boxShadow: `0 0 60px 12px ${soft}` }} />
      <div className="absolute left-1/2 top-[62%] h-[7%] w-[24%] -translate-x-1/2 -translate-y-full rounded-[3px]" style={{ background: "linear-gradient(180deg, #fbfbf8, #dedcd5)", boxShadow: "0 6px 10px -6px rgba(20,20,18,0.35)" }} />
    </div>
  );
}

/**
 * LightLiftCard — a card that lifts toward the pointer, with shadows that
 * behave like light.
 *
 * It tilts at most two degrees toward the pointer and lifts, and its two
 * shadows (a tight contact and a wide ambient, both from one light above)
 * move the way a real card's would: the ambient widens and drifts away from
 * the side that rose, the contact thins. A paper sheen at 6% follows the
 * pointer and the hairline brightens. On it, a plate of light at a colour
 * temperature. Focus does the same as hover. CSS transforms only.
 */
export function LightLiftCard({
  title,
  kicker,
  body,
  kelvin = 2700,
  meta,
  href,
  className = "",
}: {
  title: string;
  kicker?: string;
  body?: string;
  /** The colour temperature of the plate's light. */
  kelvin?: number;
  meta?: string;
  href?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [t, setT] = useState({ x: 0, y: 0, on: false });
  const move = (e: ReactPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setT({ x: ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2, y: ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2, on: true });
  };
  const rest = () => setT({ x: 0, y: 0, on: false });
  const lift = t.on ? 1 : 0;
  const rx = reduced ? 0 : -t.y * 2;
  const ry = reduced ? 0 : t.x * 2;
  const shadow = `${Math.round(-t.x * 2)}px ${1 + lift}px ${2 + lift * 2}px rgba(20,20,18,${0.06 - lift * 0.01}), ${Math.round(-t.x * 10)}px ${24 + lift * 12 + Math.round(-t.y * 6)}px ${48 + lift * 24}px -12px rgba(20,20,18,${0.1 + lift * 0.04})`;
  const inner = (
    <>
      <MmLightPlate kelvin={kelvin} className="aspect-[16/10] w-full rounded-[14px]" />
      <div className="flex flex-col gap-2 px-1 pb-1 pt-4">
        {kicker ? (
          <span className="text-[11px] uppercase" style={{ fontFamily: MONO, letterSpacing: "0.14em", color: PAPER.ink3 }}>
            {kicker}
          </span>
        ) : null}
        <h3 className="m-0 text-[22px] font-semibold leading-[1.15]" style={{ fontFamily: DISPLAY, letterSpacing: "-0.02em", color: PAPER.solid }}>
          {title}
        </h3>
        {body ? (
          <p className="m-0 text-[14.5px] leading-[1.55]" style={{ color: PAPER.ink2 }}>
            {body}
          </p>
        ) : null}
        {meta ? (
          <span className="mt-1 text-[11px] uppercase tabular-nums" style={{ fontFamily: MONO, letterSpacing: "0.1em", color: PAPER.ink3 }}>
            {meta}
          </span>
        ) : null}
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[20px]"
        style={{ background: `radial-gradient(420px circle at ${50 + t.x * 50}% ${50 + t.y * 50}%, rgba(255,255,255,0.6), transparent 55%)`, opacity: t.on ? 0.1 : 0, mixBlendMode: "soft-light", transition: `opacity 260ms ${EASE}` }}
      />
    </>
  );
  const shell = "mm-scope relative flex h-full flex-col rounded-[20px] p-3 no-underline outline-none " + className;
  const shellStyle: CSSProperties = {
    background: PAPER.surface,
    border: `1px solid ${t.on ? PAPER.line2 : PAPER.line}`,
    boxShadow: shadow,
    transform: `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(${-lift * 2}px)`,
    transition: reduced ? "none" : `transform 380ms ${EASE}, box-shadow 380ms ${EASE}, border-color 260ms ${EASE}`,
    fontFamily: SANS,
    color: PAPER.ink,
  };
  return (
    <div ref={ref} className="h-full">
      <style>{FOCUS_CSS}</style>
      {href ? (
        <a href={safeHref(href)} className={shell} style={shellStyle} onPointerMove={move} onPointerLeave={rest} onFocus={() => setT({ x: 0.2, y: -0.3, on: true })} onBlur={rest}>
          {inner}
        </a>
      ) : (
        <article tabIndex={0} className={shell} style={shellStyle} onPointerMove={move} onPointerLeave={rest} onFocus={() => setT({ x: 0.2, y: -0.3, on: true })} onBlur={rest}>
          {inner}
        </article>
      )}
    </div>
  );
}
