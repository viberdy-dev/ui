"use client";

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode, RefObject } from "react";

/**
 * ChromePourReveal — a reveal that casts its content in liquid chrome.
 *
 * When it scrolls into view, molten chrome pours down over the space,
 * drips racing ahead of the sheet and merging into it as it falls (an SVG
 * goo filter), reflecting a room that stays still while the liquid moves
 * through it. Once covered, the chrome cools away from the top down behind
 * a hot seam of light, and the content is there. Runs once; stagger a grid
 * with `delay`. The content is always in the DOM and is only hidden while
 * the chrome pours; reduced motion shows it at once.
 *
 * Part of the Liquid Chrome kit: a graphite room, a four-band chrome ramp
 * (#08090b, #4b4f58, #c9ced6, #ffffff) multiplied by a finish (chrome, gold,
 * rose, cobalt or any #rrggbb), foil colour only as a thin film. Fonts come
 * from CSS variables with Archivo and Geist fallbacks. Respects
 * prefers-reduced-motion. No dependencies beyond React. Paste it as its own
 * file: it repeats the kit's small helpers, which would clash in one module.
 */

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

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

/** A small seeded random generator, so every load draws the same thing. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The element that scrolls: null for the window, or the site itself in "self" mode. */
const ScrollRootContext = createContext<RefObject<HTMLElement | null> | null>(null);

export type ChromePourRevealProps = {
  children: ReactNode;
  /** Milliseconds to wait once in view (stagger a grid with it). */
  delay?: number;
  /** Corner radius of what is being revealed, in px, so the metal fits it. */
  radius?: number;
  /** How many drips lead the pour. */
  drips?: number;
  finish?: string;
  className?: string;
};

type Phase = "wait" | "pour" | "cool" | "done";

/**
 * A reveal that casts its content in liquid chrome. When it scrolls into
 * view, molten chrome pours down over the space, a few drips racing ahead
 * of the sheet and merging into it as it falls (an SVG goo filter), and the
 * metal reflects a room that stays still while the liquid moves through it.
 * Once the space is covered, the chrome cools away from the top down behind
 * a hot seam of light, and the content is there. It runs once. The content
 * is always in the DOM; it is only hidden while the chrome pours, never
 * without script, and reduced motion shows it at once.
 */
export function ChromePourReveal({ children, delay = 0, radius = 0, drips = 6, finish = "chrome", className }: ChromePourRevealProps) {
  const tint = finishHex(finish);
  const reduced = useReducedMotion();
  const rootRef = useContext(ScrollRootContext);
  const ref = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<SVGRectElement>(null);
  const dripRefs = useRef<(SVGRectElement | null)[]>([]);
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [phase, setPhase] = useState<Phase>("wait");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox((b) => (b.w === el.offsetWidth && b.h === el.offsetHeight ? b : { w: el.offsetWidth, h: el.offsetHeight })));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Start once a third of it (or 200px of a tall one) is in view, and only once it has a size.
  const sized = box.w > 0 && box.h > 0;
  useEffect(() => {
    const el = ref.current;
    if (!el || phase !== "wait" || !sized) return;
    if (reduced) {
      const t = setTimeout(() => setPhase("done"), 0);
      return () => clearTimeout(t);
    }
    let timer = 0;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (e.isIntersecting && (e.intersectionRatio >= 0.33 || (e.intersectionRect?.height ?? 0) >= 200)) {
          io.disconnect();
          timer = window.setTimeout(() => setPhase("pour"), delay);
        }
      },
      { root: rootRef?.current ?? null, threshold: [0, 0.05, 0.1, 0.2, 0.33, 0.5, 1] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [phase, reduced, delay, rootRef, sized]);

  // The choreography: drips lead, the sheet follows, then the metal cools away.
  useEffect(() => {
    const sheet = sheetRef.current;
    const cover = coverRef.current;
    const seam = seamRef.current;
    if (!sheet || !cover || !seam || box.h <= 0) return;
    if (phase === "pour") {
      const H = box.h;
      const timing: KeyframeAnimationOptions = { duration: 860, delay: 60, easing: "cubic-bezier(0.45, 0, 0.55, 1)", fill: "both" };
      // The sheet's front edge (its bottom) at the start and at the end.
      const front0 = H + 20 - H * 1.15;
      const front1 = H + 20;
      const anims = dripRefs.current.map((d) => {
        if (!d) return undefined;
        const dh = d.height.baseVal.value;
        // Each drip hangs from the front and stretches further ahead of it as it falls.
        const lead = (k: number) => dh * (0.25 + 0.65 * k) * Number(d.dataset.lead || 1);
        const at = (k: number) => `translateY(${(front0 + (front1 - front0) * k + lead(k) - dh).toFixed(1)}px)`;
        return d.animate([{ transform: at(0) }, { transform: at(0.5), offset: 0.5 }, { transform: at(1) }], timing);
      });
      const a = sheet.animate([{ transform: `translateY(${-H * 1.15}px)` }, { transform: "translateY(0px)" }], timing);
      a.onfinish = () => setPhase("cool");
      return () => {
        a.onfinish = null;
        anims.forEach((x) => x?.cancel());
        a.cancel();
      };
    }
    if (phase === "cool") {
      const opts: KeyframeAnimationOptions = { duration: 700, easing: EASE, fill: "both" };
      const m = cover.animate(
        [
          { WebkitMaskPosition: "0 100%", maskPosition: "0 100%" },
          { WebkitMaskPosition: "0 0%", maskPosition: "0 0%" },
        ],
        opts,
      );
      seam.animate(
        [
          { top: "-25%", opacity: 1 },
          { top: "125%", opacity: 0.3 },
        ],
        opts,
      );
      m.onfinish = () => setPhase("done");
      return () => {
        m.onfinish = null;
      };
    }
  }, [phase, box.h]);

  const { w, h } = box;
  // Drips: evenly spread columns with a seeded jitter, each a rounded bar.
  // Seeded from the instance's id, so neighbours in a grid never drip alike.
  const cols = useMemo(() => {
    const count = Math.max(1, Math.min(16, Math.round(drips)));
    let seed = 911 + count;
    for (const ch of gid) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = mulberry32(seed);
    return Array.from({ length: count }, (_, i) => {
      const f = (i + 0.5 + (rnd() - 0.5) * 0.7) / count;
      return { f, wf: 0.04 + rnd() * 0.06, hf: 0.2 + rnd() * 0.4, lead: 0.5 + rnd() * 0.9 };
    });
  }, [drips, gid]);
  const covering = phase === "wait" || phase === "pour";
  const g = (hex: string) => tinted(hex, tint);

  return (
    <div ref={ref} className={"relative" + (className ? " " + className : "")}>
      {/* Hidden only while the chrome is on its way; always there for assistive technology. */}
      <div style={{ opacity: sized && !reduced && (phase === "pour" || phase === "wait") ? 0 : 1 }}>{children}</div>
      {phase !== "done" && sized && !reduced && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: radius, visibility: phase === "wait" ? "hidden" : "visible" }}>
        <div
          ref={coverRef}
          className="absolute inset-0"
          style={{
            // The cooling wipe: transparent above the seam, metal below it.
            WebkitMaskImage: "linear-gradient(180deg, transparent 0 40%, #000 60% 100%)",
            maskImage: "linear-gradient(180deg, transparent 0 40%, #000 60% 100%)",
            WebkitMaskSize: "100% 250%",
            maskSize: "100% 250%",
            WebkitMaskPosition: "0 100%",
            maskPosition: "0 100%",
          }}
        >
          <svg width={w} height={h} className="block overflow-visible">
            <defs>
              <linearGradient id={`${gid}-c`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={h}>
                <stop offset="0" stopColor={g(RAMP[3])} />
                <stop offset="0.38" stopColor={g(RAMP[2])} />
                <stop offset="0.52" stopColor={g(RAMP[1])} />
                <stop offset="0.56" stopColor={g(RAMP[0])} />
                <stop offset="0.72" stopColor={g(RAMP[1])} />
                <stop offset="1" stopColor={g(RAMP[2])} />
              </linearGradient>
              <filter id={`${gid}-goo`} x="-10%" y="-20%" width="120%" height="140%" colorInterpolationFilters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation={Math.max(4, Math.min(10, w * 0.02))} result="b" />
                <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
              </filter>
            </defs>
            <g filter={`url(#${gid}-goo)`} fill={`url(#${gid}-c)`}>
              <rect ref={sheetRef} x={-20} y={-20} width={w + 40} height={h + 40} style={{ transform: covering ? `translateY(${-h * 1.2}px)` : undefined }} />
              {cols.map((c, i) => {
                const dw = Math.max(10, w * c.wf);
                const dh = Math.max(dw * 1.4, h * c.hf);
                return (
                  <rect
                    key={i}
                    ref={(n) => {
                      dripRefs.current[i] = n;
                    }}
                    data-lead={c.lead}
                    x={c.f * w - dw / 2}
                    y={0}
                    width={dw}
                    height={dh}
                    rx={dw / 2}
                    style={{ transform: `translateY(${-dh - 10}px)` }}
                  />
                );
              })}
            </g>
          </svg>
        </div>
        {/* The hot seam rides the cooling edge, outside the mask so it stays bright. */}
        <div ref={seamRef} className="absolute inset-x-0 h-[2px]" style={{ top: "-25%", opacity: 0, background: "#fff", boxShadow: "0 0 12px 2px rgba(255,255,255,0.8)" }} />
        </div>
      )}
    </div>
  );
}
