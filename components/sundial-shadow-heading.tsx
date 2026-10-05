"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import type { CSSProperties, RefObject } from "react";

/**
 * SundialShadowHeading — a heading whose letters cast shadows that swing like a sundial.
 *
 * Each letter stands a little off the paper with a tight contact shadow and
 * a long soft one cast by a low sun. As the heading travels through the view
 * the sun crosses the sky, bound to the scroll with no easing: the long
 * shadows swing from falling right, through short, to falling left, and a
 * faint warm band slides across the ink. CSS text-shadow and one gradient.
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

const DISPLAY = 'var(--font-inter-tight, "Inter Tight", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

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

/**
 * The element that scrolls: null for the window, or a frame. Every scroll-bound part also takes a
 * `scroller` ref, which wins over this context, so parts pasted as separate files can share one frame.
 */
export const ScrollRootContext = createContext<RefObject<HTMLElement | null> | null>(null);

/** Calls `fn` on scroll (of the scroll root or the window) and on resize; returns the cleanup. */
function onScrollOf(root: HTMLElement | null, fn: () => void): () => void {
  const target: HTMLElement | Window = root ?? window;
  target.addEventListener("scroll", fn, { passive: true });
  window.addEventListener("resize", fn);
  return () => {
    target.removeEventListener("scroll", fn);
    window.removeEventListener("resize", fn);
  };
}

/** How far an element has come through the view: 0 as its top meets the bottom, 1 as its bottom meets the top. */
function throughView(el: HTMLElement, root: HTMLElement | null): number {
  const r = el.getBoundingClientRect();
  const top = root ? root.getBoundingClientRect().top : 0;
  const h = root ? root.clientHeight : window.innerHeight;
  return clamp((top + h - r.top) / Math.max(1, h + r.height), 0, 1);
}

/**
 * Binds a value to scroll with no easing: `read` is called on every scroll
 * and resize (and once at mount) and `apply` writes the result straight to the
 * DOM, so the value moves exactly with the scroll, like scrubbing film.
 */
function useScrollBind(
  ref: RefObject<HTMLElement | null>,
  read: (el: HTMLElement, root: HTMLElement | null) => number,
  apply: (v: number) => void,
  scroller?: RefObject<HTMLElement | null> | null,
) {
  const ctx = useContext(ScrollRootContext);
  const rootRef = scroller ?? ctx;
  const readRef = useRef(read);
  const applyRef = useRef(apply);
  const runRef = useRef<() => void>(() => undefined);
  // A render may change what is read (a held progress): apply it then, not only on the next scroll.
  useEffect(() => {
    readRef.current = read;
    applyRef.current = apply;
    runRef.current();
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = rootRef?.current ?? null;
    let raf = 0;
    const run = () => {
      raf = 0;
      applyRef.current(readRef.current(el, root));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    run();
    runRef.current = onScroll;
    const off = onScrollOf(root, onScroll);
    return () => {
      off();
      cancelAnimationFrame(raf);
      raf = 0;
      runRef.current = () => undefined;
    };
  }, [ref, rootRef]);
}

/**
 * SundialShadowHeading — a heading whose letters cast soft shadows that
 * swing like a sundial as the page scrolls.
 *
 * Each letter stands a little off the paper: a tight contact shadow and a
 * long soft one, both cast by a low sun. As the heading travels through the
 * view the sun crosses the sky, bound to the scroll with no easing, so the
 * long shadows swing from falling right (morning) through short (noon) to
 * falling left (evening), and a faint band of warm light slides across the
 * ink with it. A `progress` prop holds the sun at a moment. Real text; CSS
 * text-shadow and one gradient, nothing else. Its default size,
 * clamp(44px, 8cqw, 120px), reads the nearest @container and falls back to
 * the viewport; pass fontSize in `style` for a narrow column.
 */
export function SundialShadowHeading({
  lines = "Light, / not noise.",
  as = "h2",
  progress,
  depth = 1,
  scroller,
  className = "",
  style,
}: {
  /** "/" breaks a line. */
  lines?: string;
  as?: "h1" | "h2" | "h3";
  /** 0 morning to 1 evening; holds the sun instead of following the scroll. */
  progress?: number;
  /** How far the letters stand off the paper (0.5-2). */
  depth?: number;
  /** The element that scrolls, when it isn't the window (wins over ScrollRootContext). */
  scroller?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
}) {
  const Tag = as;
  const ref = useRef<HTMLHeadingElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const parts = lines.split("/").map((l) => l.trim()).filter(Boolean);
  const cast = (v: number) => {
    const el = ref.current;
    const sh = shadowRef.current;
    if (!el || !sh) return;
    const a = (v - 0.5) * Math.PI * 0.8;
    const len = (6 + 22 * Math.abs(Math.sin(a))) * clamp(depth, 0.5, 2);
    const dx = -Math.sin(a) * len;
    const dy = Math.cos(a) * 4 + 3;
    sh.style.textShadow = `0 1px 0.5px rgba(20,20,18,0.16), ${dx.toFixed(1)}px ${dy.toFixed(1)}px ${(10 + len * 0.45).toFixed(1)}px rgba(20,20,18,${(0.1 + 0.06 * Math.abs(Math.sin(a))).toFixed(3)})`;
    el.style.setProperty("--mm-sun", `${(100 - v * 100).toFixed(1)}%`);
  };
  useScrollBind(
    ref,
    (el, root) => (progress !== undefined ? clamp(progress, 0, 1) : throughView(el, root)),
    cast,
    scroller,
  );
  const text = parts.map((p, i) => (
    <span key={i} className="block">
      {p}
    </span>
  ));
  return (
    <Tag
      ref={ref}
      className={"relative m-0 font-semibold leading-[0.98] " + className}
      style={{ fontFamily: DISPLAY, letterSpacing: "-0.035em", fontSize: "clamp(44px, 8cqw, 120px)", color: PAPER.solid, ...style }}
    >
      {/* The shadows live on a copy behind: text-shadow on gradient-clipped type would paint inside the letters. */}
      <span ref={shadowRef} aria-hidden className="pointer-events-none absolute inset-0 select-none" style={{ color: "transparent", textShadow: "0 1px 0.5px rgba(20,20,18,0.16), 0 7px 13px rgba(20,20,18,0.1)" }}>
        {text}
      </span>
      <span
        className="relative block"
        style={
          {
            backgroundImage: `linear-gradient(100deg, ${PAPER.solid} 0%, ${PAPER.solid} calc(var(--mm-sun, 50%) - 14%), #4a3a26 var(--mm-sun, 50%), ${PAPER.solid} calc(var(--mm-sun, 50%) + 14%), ${PAPER.solid} 100%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          } as CSSProperties
        }
      >
        {text}
      </span>
    </Tag>
  );
}
