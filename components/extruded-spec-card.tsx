"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

/**
 * ExtrudedSpecCard — a card that holds a small machined dial.
 *
 * The dial is built in CSS 3D (knurled discs stacked under a glass cap) on a
 * panel ringed with detent ticks. The card tilts toward the pointer and the
 * dial turns to follow it, one detent at a time on a spring, its copper
 * marker lit; focus does the same. Specs sit underneath like a data plate.
 * No WebGL.
 *
 * Part of the Spatial 3D kit: a dark studio (#0a0a0d, panels #101114 and
 * #16171b, ink #f2f1ee) with anodised copper #ff7a3d only as light, and
 * one object in three finishes (titanium, ceramic, soft-touch polymer) under
 * one rig: key, fill and rim, soft shadows, occlusion and a softbox
 * reflection. Hanken Grotesk through var(--font-hanken) for display over
 * Geist. Respects prefers-reduced-motion. No dependencies beyond React.
 * Paste it as its own file: it repeats the kit's small helpers, which would
 * clash in one module. Load Hanken Grotesk with next/font (variable:
 * "--font-hanken") on a parent, or from Google Fonts or @fontsource.
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

const DISPLAY = 'var(--font-hanken, "Hanken Grotesk", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** The dark studio the kit is set in. */
const ROOM = {
  ground: "#0a0a0d",
  panel: "#101114",
  raised: "#16171b",
  ink: "rgba(242,241,238,0.92)",
  ink2: "rgba(242,241,238,0.6)",
  ink3: "rgba(242,241,238,0.38)",
  line: "rgba(242,241,238,0.08)",
  line2: "rgba(242,241,238,0.16)",
  copper: "#ff7a3d",
} as const;

/**
 * The three finishes the object can wear. `base` is the colour; the rest are
 * shader parameters: gloss (0-1), specular strength, rim, subsurface wrap, and
 * how metallic it is. `css` holds the colours the CSS-3D parts draw with.
 */
export const S3_FINISHES = {
  titanium: {
    label: "Titanium",
    base: [0.725, 0.737, 0.761],
    gloss: 0.62,
    spec: 0.8,
    rim: 0.3,
    sss: 0,
    metal: 1,
    css: { face: "#c9ccd2", side: "#8d9098", edge: "#e6e8ec", shade: "#5d6068" },
  },
  ceramic: {
    label: "Ceramic",
    base: [0.925, 0.906, 0.867],
    gloss: 0.4,
    spec: 0.25,
    rim: 0.18,
    sss: 0.08,
    metal: 0,
    css: { face: "#ece7dd", side: "#c9c2b5", edge: "#faf7f1", shade: "#9a9386" },
  },
  polymer: {
    label: "Polymer",
    base: [0.106, 0.11, 0.125],
    gloss: 0.3,
    spec: 0.12,
    rim: 0.22,
    sss: 0,
    metal: 0,
    css: { face: "#26272c", side: "#18191d", edge: "#3a3b41", shade: "#0e0f12" },
  },
} as const;

export type S3Finish = keyof typeof S3_FINISHES;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

function finishOf(name: string) {
  return own(S3_FINISHES, name) ? S3_FINISHES[name] : S3_FINISHES.titanium;
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

/**
 * A spring for one number (stiffness 340, damping 26: a detent's snap,
 * settled in about 380ms). Returns the new value and velocity.
 */
function spring(x: number, v: number, target: number, dt: number, k = 340, c = 26): [number, number] {
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
const FOCUS_CSS = ".s3-scope :focus-visible,.s3-scope:focus-visible{outline:2px solid var(--s3-ring,#ff7a3d);outline-offset:3px;border-radius:revert-layer}";

/**
 * The dial in CSS 3D, for parts that ship no WebGL: nine knurled discs stacked
 * 2.2px apart form the ring's side, a finish-lit face and a dark glass cap sit
 * on top, and a copper marker turns with `angle`. Tilted in real perspective,
 * so its side and its shadow move as it turns toward you.
 */
function CssDial({ finish = "titanium", angle = 0, size = 180, tiltX = 24, tiltY = -16, lit = false, ticks = 0 }: { finish?: S3Finish; angle?: number; size?: number; tiltX?: number; tiltY?: number; lit?: boolean; ticks?: number }) {
  const c = finishOf(finish).css;
  const layers = 9;
  const turn = `rotate(${angle.toFixed(2)}deg)`;
  return (
    <div aria-hidden className="relative" style={{ width: size, height: size, perspective: size * 4 }}>
      <div className="absolute inset-0" style={{ transformStyle: "preserve-3d", transform: `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)` }}>
        <div className="absolute rounded-full" style={{ inset: "-9%", transform: "translateZ(-8px)", background: `radial-gradient(circle at 40% 35%, ${ROOM.raised}, ${ROOM.panel} 60%, #07070a)`, boxShadow: "0 30px 50px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(242,241,238,0.06)" }}>
          {ticks > 0 ? (
            <svg viewBox="-50 -50 100 100" className="absolute inset-0 h-full w-full">
              {Array.from({ length: ticks }, (_, i) => {
                const a = (i / ticks) * Math.PI * 2;
                const r2 = i % 5 === 0 ? 41 : 43;
                // Rounded, so the server and the browser draw the same numbers.
                const at = (r: number) => [Number((Math.sin(a) * r).toFixed(2)), Number((-Math.cos(a) * r).toFixed(2))];
                const [x1, y1] = at(45);
                const [x2, y2] = at(r2);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 5 === 0 ? "rgba(242,241,238,0.5)" : "rgba(242,241,238,0.2)"} strokeWidth={0.6} />;
              })}
            </svg>
          ) : null}
        </div>
        {Array.from({ length: layers }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              inset: "8%",
              transform: `translateZ(${(i * 2.2).toFixed(1)}px) ${turn}`,
              background: `repeating-conic-gradient(${c.side} 0 3deg, ${i === layers - 1 ? c.edge : c.shade} 3deg 6deg)`,
              filter: `brightness(${(0.72 + i * 0.035).toFixed(3)})`,
            }}
          />
        ))}
        <div
          className="absolute rounded-full"
          style={{
            inset: "13%",
            transform: `translateZ(${(layers * 2.2).toFixed(1)}px) ${turn}`,
            background: `radial-gradient(circle at 34% 28%, ${c.edge}, ${c.face} 42%, ${c.side} 100%)`,
            boxShadow: `inset 0 0 0 1px ${c.edge}, inset 0 -6px 12px rgba(0,0,0,0.25)`,
          }}
        >
          <div className="absolute rounded-full" style={{ inset: "12%", background: "radial-gradient(circle at 38% 30%, #2a2c33, #0d0e11 55%, #050507)", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.14)" }} />
          <div
            className="absolute rounded-full"
            style={{
              width: "7%",
              height: "7%",
              left: "46.5%",
              top: "17%",
              background: ROOM.copper,
              boxShadow: lit ? "0 0 6px 1px rgba(255,122,61,0.95), 0 0 18px 3px rgba(255,122,61,0.5)" : "0 0 3px rgba(255,122,61,0.6)",
              transition: "box-shadow 220ms",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export type ExtrudedSpecCardProps = {
  title: string;
  kicker?: string;
  body?: string;
  specs?: { label: string; value: string }[];
  finish?: S3Finish;
  href?: string;
  className?: string;
};

/**
 * A card that holds a small machined dial. The dial is built in CSS 3D (a
 * stack of knurled discs under a glass cap) and sits on a panel ringed with
 * detent ticks; the card tilts toward the pointer (at most 6 degrees) and the
 * dial turns to follow it, one detent at a time on a spring, its copper
 * marker lit while you're there. Focus does the same. The specs underneath
 * are set in mono, like a data plate.
 */
export function ExtrudedSpecCard({ title, kicker, body, specs = [], finish = "titanium", href, className }: ExtrudedSpecCardProps) {
  const [pose, setPose] = useState({ rx: 0, ry: 0, turn: 0, on: false });
  const turnRef = useRef({ x: 0, v: 0, raf: 0, last: 0 });
  const [angle, setAngle] = useState(0);
  const reduced = useReducedMotion();

  // The dial settles on its detent with a spring (stiffness 340, damping 26).
  useEffect(() => {
    const t = turnRef.current;
    const target = pose.turn;
    if (reduced) {
      t.x = target;
      const id = requestAnimationFrame(() => setAngle(target));
      return () => cancelAnimationFrame(id);
    }
    const step = (now: number) => {
      const dt = t.last ? Math.min(0.05, (now - t.last) / 1000) : 1 / 60;
      t.last = now;
      [t.x, t.v] = spring(t.x, t.v, target, dt);
      setAngle(t.x);
      if (Math.abs(target - t.x) > 0.02 || Math.abs(t.v) > 0.02) t.raf = requestAnimationFrame(step);
      else t.last = 0;
    };
    cancelAnimationFrame(t.raf);
    t.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(t.raf);
  }, [pose.turn, reduced]);

  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setPose({ rx: reduced ? 0 : -y * 12, ry: reduced ? 0 : x * 12, turn: Math.round(x * 20) * 6, on: true });
  };
  const rest = () => setPose({ rx: 0, ry: 0, turn: 0, on: false });
  const shared = {
    onPointerMove: onMove,
    onPointerLeave: rest,
    onFocus: () => setPose((p) => ({ ...p, turn: 30, on: true })),
    onBlur: rest,
    className: "s3-scope group block rounded-[20px] border p-5 outline-none " + (className ?? ""),
    style: {
      background: `linear-gradient(180deg, ${ROOM.raised}, ${ROOM.panel})`,
      borderColor: pose.on ? ROOM.line2 : ROOM.line,
      color: ROOM.ink,
      transform: `perspective(900px) rotateX(${pose.rx.toFixed(2)}deg) rotateY(${pose.ry.toFixed(2)}deg)`,
      transition: `transform 380ms ${EASE}, border-color 220ms`,
      "--s3-ring": ROOM.copper,
    } as CSSProperties,
  };
  const inner = (
    <>
      <span className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.18em]" style={{ fontFamily: MONO, color: ROOM.ink3 }}>
        <span>{kicker}</span>
        <span className="tabular-nums">{String(((Math.round(angle / 6) % 60) + 60) % 60).padStart(2, "0")}/60</span>
      </span>
      <span className="my-5 grid place-items-center">
        <CssDial finish={finish} angle={angle} size={148} tiltX={24 - pose.rx} tiltY={-16 + pose.ry} lit={pose.on} ticks={60} />
      </span>
      <span className="block text-[26px] font-semibold leading-[1.05] tracking-[-0.02em]" style={{ fontFamily: DISPLAY, color: "#f2f1ee" }}>
        {title}
      </span>
      {body ? (
        <span className="mt-2 block text-[14px] leading-[1.55]" style={{ fontFamily: SANS, color: ROOM.ink2 }}>
          {body}
        </span>
      ) : null}
      {specs.length ? (
        <span className="mt-4 grid gap-1.5 border-t pt-3" style={{ borderColor: ROOM.line }}>
          {specs.map((s) => (
            <span key={s.label} className="flex justify-between gap-4 text-[11px] uppercase tracking-[0.14em]" style={{ fontFamily: MONO }}>
              <span style={{ color: ROOM.ink3 }}>{s.label}</span>
              <span className="tabular-nums" style={{ color: ROOM.ink2 }}>
                {s.value}
              </span>
            </span>
          ))}
        </span>
      ) : null}
    </>
  );
  return (
    <>
      <style>{FOCUS_CSS}</style>
      {href ? (
        <a href={safeHref(href)} {...shared}>
          {inner}
        </a>
      ) : (
        <div tabIndex={0} {...shared}>
          {inner}
        </div>
      )}
    </>
  );
}
