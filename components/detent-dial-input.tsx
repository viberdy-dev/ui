"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

/**
 * DetentDialInput — a number set by turning a dial.
 *
 * The kit's CSS-3D knob: drag round it and it steps through detents,
 * springing onto each while its copper marker ticks. A real slider: arrow
 * keys, Page Up and Down, Home and End, announced with its format;
 * controlled or not, and it submits in a form with `name`. No WebGL.
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

export type DetentDialInputProps = {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** How the value reads (a unit, a sign). */
  format?: (value: number) => string;
  /** Detents in one full turn of the dial. */
  detents?: number;
  finish?: S3Finish;
  size?: number;
  /** A form field name: the value is submitted in a hidden input. */
  name?: string;
  hint?: string;
  className?: string;
};

/**
 * A number set by turning a dial. The dial is the kit's CSS-3D knob (knurled
 * discs under a glass cap); drag round it and it steps through detents (60 a
 * turn by default), springing onto each one (stiffness 340, damping 26) while
 * its copper marker ticks. It is a real slider: focus it and use the arrow
 * keys, Page Up and Down for ten steps, Home and End for the ends; the value is
 * announced with its format. Controlled or not; with `name` it submits in a
 * form.
 */
export function DetentDialInput({ label, min = 0, max = 100, step: stepProp = 1, value, defaultValue, onChange, format = (v) => String(v), detents = 60, finish = "titanium", size = 220, name, hint, className }: DetentDialInputProps) {
  // A step of zero (or less) would divide by zero; one is the safe floor.
  const step = stepProp > 0 ? stepProp : 1;
  const [local, setLocal] = useState(clamp(defaultValue ?? min, min, max));
  const v = clamp(value ?? local, min, max);
  const [shown, setShown] = useState(0);
  const [tick, setTick] = useState(false);
  const anim = useRef({ x: 0, v: 0, raf: 0, last: 0 });
  const drag = useRef<{ a0: number; v0: number } | null>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const labelId = useId();
  const per = 360 / Math.max(6, detents);
  const target = ((v - min) / step) * per;

  const set = (next: number) => {
    const n = clamp(Math.round((next - min) / step) * step + min, min, max);
    const fixed = Number(n.toFixed(6));
    if (fixed === v) return;
    if (value === undefined) setLocal(fixed);
    onChange?.(fixed);
    setTick(true);
  };

  // The marker ticks for 120ms on every detent.
  useEffect(() => {
    if (!tick) return;
    const id = window.setTimeout(() => setTick(false), 120);
    return () => window.clearTimeout(id);
  }, [tick]);

  // The dial springs onto its detent.
  useEffect(() => {
    const t = anim.current;
    if (reduced) {
      t.x = target;
      const id = requestAnimationFrame(() => setShown(target));
      return () => cancelAnimationFrame(id);
    }
    const stepFrame = (now: number) => {
      const dt = t.last ? Math.min(0.05, (now - t.last) / 1000) : 1 / 60;
      t.last = now;
      [t.x, t.v] = spring(t.x, t.v, target, dt);
      setShown(t.x);
      if (Math.abs(target - t.x) > 0.02 || Math.abs(t.v) > 0.02) t.raf = requestAnimationFrame(stepFrame);
      else t.last = 0;
    };
    cancelAnimationFrame(t.raf);
    t.raf = requestAnimationFrame(stepFrame);
    return () => cancelAnimationFrame(t.raf);
  }, [target, reduced]);

  const angleAt = (e: ReactPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI;
  };
  const onDown = (e: ReactPointerEvent<HTMLElement>) => {
    drag.current = { a0: angleAt(e), v0: v };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
  };
  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    let da = angleAt(e) - d.a0;
    // Keep turning past the top: unwrap the angle so a full turn keeps counting.
    if (da > 180) {
      da -= 360;
      d.a0 += 360;
    } else if (da < -180) {
      da += 360;
      d.a0 -= 360;
    }
    set(d.v0 + (da / per) * step);
  };
  const onUp = () => {
    drag.current = null;
  };
  const onKey = (e: ReactKeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: step * 10, PageDown: -step * 10 };
    if (e.key in map) {
      e.preventDefault();
      set(v + map[e.key]);
    } else if (e.key === "Home") {
      e.preventDefault();
      set(min);
    } else if (e.key === "End") {
      e.preventDefault();
      set(max);
    }
  };

  return (
    <div className={"s3-scope flex flex-col items-center gap-5 " + (className ?? "")} style={{ color: ROOM.ink, "--s3-ring": ROOM.copper } as CSSProperties}>
      <style>{FOCUS_CSS}</style>
      <span id={labelId} className="text-[11px] uppercase tracking-[0.18em]" style={{ fontFamily: MONO, color: ROOM.ink3 }}>
        {label}
      </span>
      <div
        ref={dialRef}
        role="slider"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={v}
        aria-valuetext={format(v)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
        className="cursor-grab touch-none rounded-full outline-none active:cursor-grabbing"
      >
        <CssDial finish={finish} angle={shown} size={size} tiltX={18} tiltY={-10} lit={tick} ticks={Math.min(120, detents)} />
      </div>
      <span className="text-[44px] font-semibold leading-none tracking-[-0.02em] tabular-nums" style={{ fontFamily: DISPLAY, color: "#f2f1ee" }}>
        {format(v)}
      </span>
      {hint ? (
        <span className="text-[13px]" style={{ fontFamily: SANS, color: ROOM.ink3 }}>
          {hint}
        </span>
      ) : null}
      {name ? <input type="hidden" name={name} value={v} /> : null}
    </div>
  );
}
