"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";

/**
 * SquashPressButton — a pill that squashes under your finger and pops back.
 *
 * Press and it squashes onto its base where you pressed, its area kept;
 * hold and it sinks further, up to 600ms; let go and it springs back past
 * rest, one overshoot, settled inside 450ms. Its shadows (a contact and a
 * wide one tinted by its own colour) collapse to one line while pressed.
 * Swipe across it and it jiggles the way you pushed. Gum, ink and soft.
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

/** A soft object resting in dough: a tight contact shadow and a wide one tinted by the object. */
function softShadow(tint = "23,19,15", lift = 1): string {
  return `0 ${(2 * lift).toFixed(1)}px ${(6 * lift).toFixed(1)}px rgba(23,19,15,0.1), 0 ${(18 * lift).toFixed(1)}px ${(40 * lift).toFixed(1)}px -8px rgba(${tint},${(0.2 * Math.min(1, lift)).toFixed(3)})`;
}

/** Pressed into the dough: both shadows collapse to one tight line. */
const PRESSED_SHADOW = "0 1px 3px rgba(23,19,15,0.14)";

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

/**
 * Squash and stretch for one element, on a spring. `press(depth)` squashes it
 * onto its foot with its area kept (as short as it gets, it gets as wide);
 * `release()` lets it spring back past rest, one visible overshoot, settled
 * inside 450ms; `flick(v)` gives it a sideways jiggle (a skew) from a push.
 * The transform is written straight to the element; nothing re-renders.
 */
function useSquish(ref: RefObject<HTMLElement | null>, origin = "50% 100%") {
  const reduced = useReducedMotion();
  const st = useRef({ y: 1, v: 0, t: 1, sk: 0, skv: 0, raf: 0, last: 0 });
  const tickRef = useRef<(now: number) => void>(() => undefined);
  useEffect(() => {
    const s = st.current;
    const el = ref.current;
    if (el) {
      el.style.transformOrigin = origin;
      // The spring owns the transform; a stylesheet's transition would smear it.
      el.style.transitionProperty = el.style.transitionProperty && el.style.transitionProperty !== "all" ? el.style.transitionProperty : "none";
    }
    tickRef.current = (now: number) => {
      s.raf = 0;
      const dt = s.last ? Math.min(1 / 30, (now - s.last) / 1000) : 1 / 60;
      s.last = now;
      // k 420, c 18: one overshoot of about 20%, settled inside ~440ms.
      for (let i = 0; i < 3; i++) {
        const h = dt / 3;
        s.v += (420 * (s.t - s.y) - 18 * s.v) * h;
        s.y += s.v * h;
        s.skv += (-380 * s.sk - 20 * s.skv) * h;
        s.sk += s.skv * h;
      }
      const e = ref.current;
      const y = clamp(s.y, 0.5, 1.6);
      if (e) e.style.transform = `scale(${(1 / y).toFixed(4)}, ${y.toFixed(4)}) skewX(${s.sk.toFixed(3)}deg)`;
      const moving = Math.abs(s.v) > 0.002 || Math.abs(s.y - s.t) > 0.0015 || Math.abs(s.sk) > 0.02 || Math.abs(s.skv) > 0.05;
      if (moving) s.raf = requestAnimationFrame((t) => tickRef.current(t));
      else {
        s.last = 0;
        if (e && s.t === 1) {
          s.y = 1;
          s.sk = 0;
          e.style.transform = "";
        }
      }
    };
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.last = 0;
    };
  }, [ref, origin]);
  const kick = () => {
    const s = st.current;
    if (!s.raf) s.raf = requestAnimationFrame((t) => tickRef.current(t));
  };
  return {
    press: (depth = 0.86) => {
      if (reduced) return;
      st.current.t = clamp(depth, 0.6, 1);
      kick();
    },
    release: () => {
      st.current.t = 1;
      if (!reduced) kick();
    },
    flick: (v: number) => {
      if (reduced) return;
      st.current.skv += clamp(v, -1, 1) * 160;
      kick();
    },
  };
}

// Each part carries only the CSS it needs, so any one of them works on its own.
// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".tm-scope :focus-visible,.tm-scope:focus-visible{outline:2.5px solid var(--tm-ring,#17130f)!important;outline-offset:3px;border-radius:revert-layer}";

const TM_BUTTON_INK = {
  gum: { bg: DOUGH.gum, fg: "#fffaf1", tint: "255,45,120", border: "transparent" },
  ink: { bg: DOUGH.solid, fg: "#fffaf1", tint: "23,19,15", border: "transparent" },
  soft: { bg: DOUGH.surface, fg: DOUGH.solid, tint: "23,19,15", border: "rgba(23,19,15,0.1)" },
} as const;

export type TmButtonVariant = keyof typeof TM_BUTTON_INK;

/**
 * SquashPressButton — a pill that squashes under your finger and pops back.
 *
 * Press and it squashes onto its base where you pressed, its area kept (as it
 * gets shorter it gets wider); hold and it sinks further, up to a deep press
 * at 600ms; let go and it springs back past rest, one overshoot, settled
 * inside 450ms. Its two shadows (a contact and a wide one tinted by the pill's
 * own colour) collapse to one tight line while pressed. Swipe across it and it
 * jiggles the way you pushed it. Gum, ink and soft; a link when given an href.
 */
export function SquashPressButton({
  children,
  href,
  onClick,
  type = "button",
  variant = "ink",
  size = "lg",
  disabled = false,
  ariaLabel,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: TmButtonVariant;
  size?: "lg" | "md" | "sm";
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const ink = TM_BUTTON_INK[variant] ?? TM_BUTTON_INK.ink;
  const bodyRef = useRef<HTMLSpanElement>(null);
  const squish = useSquish(bodyRef);
  const [state, setState] = useState<"rest" | "hover" | "down">("rest");
  const hold = useRef({ t0: 0, raf: 0, x: 0, t: 0 });

  // Holding sinks it further: 0.9 at the press, 0.8 by 600ms.
  useEffect(() => {
    const h = hold.current;
    return () => {
      cancelAnimationFrame(h.raf);
      h.raf = 0;
    };
  }, []);
  const deepen = () => {
    const h = hold.current;
    const run = (now: number) => {
      h.raf = 0;
      const k = clamp((now - h.t0) / 600, 0, 1);
      squish.press(0.9 - 0.1 * k);
      if (k < 1) h.raf = requestAnimationFrame(run);
    };
    cancelAnimationFrame(h.raf);
    h.raf = requestAnimationFrame(run);
  };
  const down = (xPct: number) => {
    // It squashes onto its base under your finger, not about its middle.
    if (bodyRef.current) bodyRef.current.style.transformOrigin = `${clamp(xPct, 15, 85).toFixed(0)}% 100%`;
    setState("down");
    hold.current.t0 = performance.now();
    squish.press(0.9);
    deepen();
  };
  const up = (to: "rest" | "hover") => {
    cancelAnimationFrame(hold.current.raf);
    hold.current.raf = 0;
    setState(to);
    squish.release();
  };

  const pad = size === "sm" ? "h-9 px-4 text-[12.5px]" : size === "md" ? "h-11 px-5 text-[13.5px]" : "h-14 px-7 text-[15px]";
  const shadow = state === "down" ? PRESSED_SHADOW : softShadow(ink.tint, state === "hover" ? 1.3 : 1);
  const handlers = {
    "aria-label": ariaLabel,
    className: "tm-scope group relative inline-flex select-none rounded-full no-underline outline-none " + (disabled ? "pointer-events-none opacity-40 " : "") + className,
    style: { WebkitTapHighlightColor: "transparent", touchAction: "manipulation" } as CSSProperties,
    onPointerEnter: (e: ReactPointerEvent<HTMLElement>) => {
      setState("hover");
      hold.current.x = e.clientX;
      hold.current.t = performance.now();
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      hold.current.x = e.clientX;
      hold.current.t = performance.now();
    },
    onPointerLeave: (e: ReactPointerEvent<HTMLElement>) => {
      const dt = Math.max(8, performance.now() - hold.current.t);
      // A quick swipe out leaves it jiggling the way it was pushed.
      squish.flick(((e.clientX - hold.current.x) / dt) * 0.6);
      up("rest");
    },
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      const r = e.currentTarget.getBoundingClientRect();
      down(((e.clientX - r.left) / Math.max(1, r.width)) * 100);
    },
    onPointerUp: () => up("hover"),
    onPointerCancel: () => up("rest"),
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => {
      if (e.repeat) return;
      if (e.key === "Enter" || (e.key === " " && !href)) down(50);
    },
    onKeyUp: () => {
      if (state === "down") up("rest");
    },
    onBlur: () => {
      if (state === "down") up("rest");
    },
  };
  // The pill that squashes and its shadow live on an inner span, so the hit area never moves.
  const pill = (
    <span
      ref={bodyRef}
      className={"relative inline-flex items-center justify-center rounded-full " + pad}
      style={{
        background: ink.bg,
        color: ink.fg,
        border: `1px solid ${ink.border}`,
        boxShadow: shadow,
        fontFamily: DISPLAY,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        transition: "box-shadow 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        willChange: "transform",
      }}
    >
      <span className="whitespace-nowrap">{children}</span>
    </span>
  );
  if (href) {
    return (
      <>
        <style>{FOCUS_CSS}</style>
        <a href={safeHref(href)} onClick={onClick} {...handlers}>
          {pill}
        </a>
      </>
    );
  }
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <button type={type} onClick={onClick} disabled={disabled} {...handlers}>
        {pill}
      </button>
    </>
  );
}
