"use client";

import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import type { CSSProperties, RefObject } from "react";

/**
 * PourFillHeading — a heading that fills with liquid chrome.
 *
 * At rest the letters are an empty mould (a hairline outline). As the
 * heading scrolls up the viewport, molten chrome rises inside them; its
 * surface is a meniscus, a wave with a hot line of light along it that
 * drifts slowly and sloshes with scroll speed before settling. Pass
 * `level` (0-1) to drive it yourself. Pure CSS masks and background clip:
 * no canvas. Reduced motion shows it filled.
 *
 * Part of the Liquid Chrome kit: a graphite room, a four-band chrome ramp
 * (#08090b, #4b4f58, #c9ced6, #ffffff) multiplied by a finish (chrome, gold,
 * rose, cobalt or any #rrggbb), foil colour only as a thin film. Fonts come
 * from CSS variables with Archivo and Geist fallbacks. Respects
 * prefers-reduced-motion. No dependencies beyond React. Paste it as its own
 * file: it repeats the kit's small helpers, which would clash in one module.
 */

const DISPLAY = 'var(--font-display, "Archivo", "Helvetica Neue", Arial, sans-serif)';

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

/** The element that scrolls: null for the window, or the site itself in "self" mode. */
const ScrollRootContext = createContext<RefObject<HTMLElement | null> | null>(null);

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** One period of the meniscus, 240 x 24, filled below the wave. */
const WAVE_FILL = svgUrl(
  "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='24' viewBox='0 0 240 24' preserveAspectRatio='none'><path d='M0 12 Q30 3 60 12 T120 12 T180 12 T240 12 V24 H0 Z' fill='black'/></svg>",
);

/** The same wave as a hot line of light, for the meniscus itself. */
const WAVE_LINE = svgUrl(
  "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='24' viewBox='0 0 240 24' preserveAspectRatio='none'><path d='M0 13.5 Q30 4.5 60 13.5 T120 13.5 T180 13.5 T240 13.5' fill='none' stroke='white' stroke-width='2.5' vector-effect='non-scaling-stroke'/></svg>",
);

export type PourFillHeadingProps = {
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  finish?: string;
  /** Fill level 0-1. Leave unset and the heading fills as it scrolls up the viewport. */
  level?: number;
  align?: "left" | "center";
  className?: string;
  style?: CSSProperties;
};

/**
 * A heading that fills with liquid chrome. At rest the letters are an empty
 * mould (a hairline outline); as the heading scrolls up the viewport, molten
 * chrome rises inside them. The surface is a meniscus: a wave with a hot line
 * of light along it that drifts slowly and sloshes with scroll speed, then
 * settles. Every line of a wrapped heading reflects the same room. Pass
 * `level` to drive it yourself (a progress, a countdown). Reduced motion
 * shows it filled.
 */
export function PourFillHeading({ text, as: Tag = "h2", finish = "chrome", level, align = "left", className, style }: PourFillHeadingProps) {
  const tint = finishHex(finish);
  const reduced = useReducedMotion();
  const rootRef = useContext(ScrollRootContext);
  const ref = useRef<HTMLElement | null>(null);
  const metalRef = useRef<HTMLSpanElement>(null);
  // The surface survives prop changes: a new level eases from where the metal is.
  const sim = useRef({ lv: 0, vel: 0, amp: 0.35, wx: 0 });
  const levelRef = useRef(level);
  const kickRef = useRef<() => void>(() => {});

  useEffect(() => {
    levelRef.current = level;
    kickRef.current();
  }, [level]);

  useEffect(() => {
    const el = ref.current;
    const metal = metalRef.current;
    if (!el || !metal) return;
    const scroller: HTMLElement | Window = rootRef?.current ?? window;
    const m = sim.current;
    let raf = 0;
    let last = 0;
    let visible = false;
    const goal = () => {
      if (reduced) return 1;
      const level = levelRef.current;
      if (level !== undefined) return Math.max(0, Math.min(1, level));
      const r = el.getBoundingClientRect();
      const top = scroller instanceof Window ? 0 : scroller.getBoundingClientRect().top;
      const vh = scroller instanceof Window ? window.innerHeight : scroller.clientHeight;
      return Math.max(0, Math.min(1, (vh * 0.92 - (r.top - top)) / (vh * 0.55)));
    };
    const paint = () => {
      const h = metal.offsetHeight;
      metal.style.setProperty("--fy", `${(h * (1 - m.lv)).toFixed(1)}px`);
      metal.style.setProperty("--amp", m.amp.toFixed(3));
      metal.style.setProperty("--wx", `${m.wx.toFixed(1)}px`);
    };
    const step = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      const g = goal();
      m.vel += ((g - m.lv) * 60 - m.vel * 11) * dt;
      m.lv += m.vel * dt;
      // Speed sloshes the surface; it settles back to a slow swell.
      m.amp += (0.35 + Math.min(1.1, Math.abs(m.vel) * 2.4) - m.amp) * (1 - Math.exp(-dt * 6));
      m.wx = (m.wx + dt * (8 + Math.abs(m.vel) * 260)) % 240;
      paint();
      const showing = m.lv > 0.002 && m.lv < 1.02;
      const settling = Math.abs(g - m.lv) > 0.001 || Math.abs(m.vel) > 0.001;
      if (visible && (settling || showing)) raf = requestAnimationFrame(step);
      else last = 0;
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(step);
    };
    if (reduced) {
      m.lv = 1;
      m.vel = 0;
      m.amp = 0;
      paint();
      return;
    }
    kickRef.current = kick;
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) kick();
    });
    io.observe(el);
    scroller.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    paint();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      scroller.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      kickRef.current = () => {};
    };
  }, [reduced, rootRef]);

  const strip = "calc(var(--fy) - var(--amp) * 12px)";
  return (
    <Tag
      ref={(n: HTMLElement | null) => {
        ref.current = n;
      }}
      className={"lc-scope relative m-0" + (className ? " " + className : "")}
      style={{
        ...finishVars(tint),
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontStretch: "125%",
        fontSize: "clamp(40px, 6.5cqw, 92px)",
        lineHeight: 1.02,
        letterSpacing: "-0.02em",
        textAlign: align,
        textWrap: "balance",
        ...style,
      }}
    >
      {/* The empty mould. */}
      <span className="block" style={{ color: "rgba(255,255,255,0.035)", WebkitTextStroke: `1px ${LINE_2}` }}>
        {text}
      </span>
      {/* The metal, masked below a moving meniscus. */}
      <span
        ref={metalRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 block select-none"
        style={
          {
            "--fy": "200%",
            "--amp": "0.35",
            "--wx": "0px",
            color: "transparent",
            backgroundImage: `${WAVE_LINE}, ${CHROME_BG}`,
            backgroundSize: "240px calc(var(--amp) * 24px + 2px), 100% 1.02em",
            backgroundRepeat: "repeat-x, repeat-y",
            backgroundPosition: `var(--wx) ${strip}, 0 0`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitMaskImage: `${WAVE_FILL}, linear-gradient(#000, #000)`,
            maskImage: `${WAVE_FILL}, linear-gradient(#000, #000)`,
            WebkitMaskSize: "240px calc(var(--amp) * 24px + 1px), 100% 100%",
            maskSize: "240px calc(var(--amp) * 24px + 1px), 100% 100%",
            WebkitMaskRepeat: "repeat-x, no-repeat",
            maskRepeat: "repeat-x, no-repeat",
            WebkitMaskPosition: `var(--wx) ${strip}, 0 calc(var(--fy) + var(--amp) * 12px)`,
            maskPosition: `var(--wx) ${strip}, 0 calc(var(--fy) + var(--amp) * 12px)`,
          } as CSSProperties
        }
      >
        {text}
      </span>
    </Tag>
  );
}
