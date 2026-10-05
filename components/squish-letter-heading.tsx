"use client";

import { Fragment, useEffect, useRef, useSyncExternalStore } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

/**
 * SquishLetterHeading — a heading whose letters squash under the pointer.
 *
 * The letter under the pointer squashes onto the baseline, growing as wide
 * as it grows short, while its neighbours bulge up with what it lost; quick
 * passes add a lean. Every letter has its own spring, so the line ripples
 * behind the pointer and settles back to crisp type. DOM only.
 *
 * Part of the Tactile Maximalism kit: dough #f7f0e4, warm ink #17130f and
 * one loud accent, bubblegum #ff2d78, filled once per screen; grain fixed to
 * the material; soft shadows tinted by what casts them, never a hard offset.
 * Everything soft keeps its area as it squashes and settles inside 450ms.
 * Unbounded through var(--font-unbounded) for display over Geist. Respects
 * prefers-reduced-motion. No dependencies beyond React. Paste it as its own
 * file: it repeats the kit's small helpers, which would clash in one module.
 * Load Unbounded with next/font (variable: "--font-unbounded") on a
 * parent, or from Google Fonts or @fontsource.
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries plugin).
 */

const DISPLAY = 'var(--font-unbounded, "Unbounded", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

/** Dough, warm ink, and one loud accent. */
const DOUGH = {
  ground: "#f7f0e4",
  surface: "#fffaf1",
  well: "#efe5d3",
  solid: "#17130f",
  ink: "rgba(23,19,15,0.92)",
  ink2: "rgba(23,19,15,0.64)",
  ink3: "rgba(23,19,15,0.42)",
  line: "rgba(23,19,15,0.1)",
  line2: "rgba(23,19,15,0.18)",
  gum: "#ff2d78",
  gumDeep: "#d8155d",
  lilac: "#e8e1f6",
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
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

/**
 * SquishLetterHeading — a heading whose letters squash under the pointer and
 * push their neighbours up.
 *
 * Run the pointer along the line and the letter under it squashes onto the
 * baseline, growing as wide as it grows short, while the letters on either
 * side bulge up a little with what it lost; quick passes add a sideways lean.
 * Every letter is on its own spring (one overshoot, settled inside 450ms), so
 * the line ripples behind the pointer and settles back to crisp type. One
 * word can sit in bubblegum. DOM only: the text stays real, selectable text.
 */
export function SquishLetterHeading({
  text = "Everything you drop, one page.",
  accent = "drop,",
  as: Tag = "h2",
  size = "clamp(34px, 7.4cqw, 96px)",
  className = "",
  style,
}: {
  text?: string;
  /** A word (exactly as written) set in bubblegum. */
  accent?: string;
  as?: "h1" | "h2" | "h3" | "p";
  size?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const spans = useRef<(HTMLSpanElement | null)[]>([]);
  const reduced = useReducedMotion();
  const sim = useRef({ y: new Float32Array(0), v: new Float32Array(0), t: new Float32Array(0), sk: new Float32Array(0), skv: new Float32Array(0), raf: 0, last: 0, px: -1e4, vx: 0, lastX: 0, lastT: 0 });
  const tickRef = useRef<(now: number) => void>(() => undefined);
  const words = text.split(" ").filter(Boolean);
  const lengths = words.map((w) => [...w].length);
  const count = lengths.reduce((a, b) => a + b, 0);
  const starts = lengths.map((_, wi) => lengths.slice(0, wi).reduce((a, b) => a + b, 0));

  useEffect(() => {
    const st = sim.current;
    st.y = new Float32Array(count).fill(1);
    st.v = new Float32Array(count);
    st.t = new Float32Array(count).fill(1);
    st.sk = new Float32Array(count);
    st.skv = new Float32Array(count);
    tickRef.current = (now: number) => {
      st.raf = 0;
      const dt = st.last ? Math.min(1 / 30, (now - st.last) / 1000) : 1 / 60;
      st.last = now;
      let moving = false;
      for (let i = 0; i < count; i++) {
        for (let k = 0; k < 2; k++) {
          const h = dt / 2;
          st.v[i] += (420 * (st.t[i] - st.y[i]) - 18 * st.v[i]) * h;
          st.y[i] += st.v[i] * h;
          st.skv[i] += (-380 * st.sk[i] - 20 * st.skv[i]) * h;
          st.sk[i] += st.skv[i] * h;
        }
        const el = spans.current[i];
        if (el) el.style.transform = `scale(${(1 / st.y[i]).toFixed(4)}, ${st.y[i].toFixed(4)}) skewX(${st.sk[i].toFixed(2)}deg)`;
        if (Math.abs(st.v[i]) > 0.003 || Math.abs(st.t[i] - st.y[i]) > 0.002 || Math.abs(st.sk[i]) > 0.03 || Math.abs(st.skv[i]) > 0.1) moving = true;
      }
      if (moving) st.raf = requestAnimationFrame((n) => tickRef.current(n));
      else {
        st.last = 0;
        // Settled: clear the transforms only if every letter is at rest; a held squash stays squashed.
        if (st.t.every((t) => t === 1)) {
          spans.current.forEach((el) => {
            if (el) el.style.transform = "";
          });
        }
      }
    };
    return () => {
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      st.last = 0;
    };
  }, [count]);

  const kick = () => {
    const st = sim.current;
    if (!st.raf) st.raf = requestAnimationFrame((n) => tickRef.current(n));
  };
  // Aim every letter from the pointer: the one under it squashes, its neighbours take up the volume.
  const aim = (x: number, y: number, speed: number) => {
    const st = sim.current;
    for (let i = 0; i < count; i++) {
      const el = spans.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const inRow = y >= r.top - r.height * 0.1 && y <= r.bottom + r.height * 0.1;
      const d = inRow ? Math.abs(x - (r.left + r.width / 2)) / Math.max(1, r.width) : 99;
      st.t[i] = d < 0.6 ? 0.8 : d < 1.6 ? 1 + 0.07 * (1.6 - d) : 1;
      if (d < 1) st.skv[i] += clamp(speed, -2, 2) * 40 * (1 - d);
    }
    kick();
  };
  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (reduced) return;
    const st = sim.current;
    const now = performance.now();
    const speed = st.lastT ? (e.clientX - st.lastX) / Math.max(8, now - st.lastT) : 0;
    st.lastX = e.clientX;
    st.lastT = now;
    aim(e.clientX, e.clientY, speed);
  };
  const onLeave = () => {
    const st = sim.current;
    st.t.fill(1);
    st.lastT = 0;
    kick();
  };

  return (
    <Tag
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={"tm-scope m-0 w-full @container " + className}
      style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: "-0.04em", color: DOUGH.solid, ...style }}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden>
      {words.map((w, wi) => (
        <Fragment key={wi}>
        <span className="inline-block whitespace-nowrap" style={{ color: w === accent ? DOUGH.gum : undefined }}>
          {[...w].map((ch, ci) => {
            const i = starts[wi] + ci;
            return (
              <span key={ci} ref={(el) => void (spans.current[i] = el)} className="inline-block" style={{ transformOrigin: "50% 88%", willChange: "transform", transition: "none" }}>
                {ch}
              </span>
            );
          })}
        </span>
        {/* The space sits between the words: inside an inline-block it would collapse. */}
        {wi < words.length - 1 ? " " : null}
        </Fragment>
      ))}
      </span>
    </Tag>
  );
}
