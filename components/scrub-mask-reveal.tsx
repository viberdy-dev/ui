"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";

/**
 * ScrubMaskReveal — a plate that opens exactly with the scroll.
 *
 * Its frame starts inset (a rounded window a fifth in from each side) and
 * opens to full as the plate comes up through the view, while the picture
 * inside eases from 112% to 100% so it seems to stay still. Bound to the
 * scroll with no easing: stop and it stops, scroll back and it closes. A
 * hairline fills with the progress. Renders open without script.
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
 * ScrubMaskReveal — a plate that opens exactly with the scroll.
 *
 * Its frame starts inset (a rounded window a fifth in from each side) and
 * opens to full as the plate comes up through the view, while the picture
 * inside eases the other way, from 112% to 100%, so it seems to stay still
 * while the window widens. Bound to the scroll with no easing: stop
 * scrolling and it stops; scroll back and it closes. A hairline at the edge
 * fills with the progress. Renders open without script; a `progress` prop
 * holds it at a moment.
 */
export function ScrubMaskReveal({
  children,
  inset = 0.2,
  radius = 28,
  rail = true,
  progress,
  scroller,
  className = "",
  style,
}: {
  children: ReactNode;
  /** How far in the frame starts, as a share of each side (0-0.4). */
  inset?: number;
  radius?: number;
  /** A hairline that fills with the progress. */
  rail?: boolean;
  /** 0 closed to 1 open; holds it instead of following the scroll. */
  progress?: number;
  /** The element that scrolls, when it isn't the window (wins over ScrollRootContext). */
  scroller?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  useScrollBind(
    ref,
    (el, root) => {
      if (progress !== undefined) return clamp(progress, 0, 1);
      // Open between the plate's top entering the lower fifth and its middle reaching the middle of the view.
      const r = el.getBoundingClientRect();
      const top = root ? root.getBoundingClientRect().top : 0;
      const h = root ? root.clientHeight : window.innerHeight;
      return clamp((top + h * 0.95 - r.top) / Math.max(1, h * 0.45 + r.height * 0.5), 0, 1);
    },
    (v) => {
      const k = clamp(inset, 0, 0.4) * (1 - v);
      const f = frameRef.current;
      const i = innerRef.current;
      if (f) {
        const c = `inset(${(k * 100).toFixed(2)}% ${(k * 110).toFixed(2)}% ${(k * 100).toFixed(2)}% ${(k * 110).toFixed(2)}% round ${radius}px)`;
        f.style.clipPath = c;
        f.style.setProperty("-webkit-clip-path", c);
      }
      if (i) i.style.transform = `scale(${(1 + 0.12 * (1 - v)).toFixed(4)})`;
      if (railRef.current) railRef.current.style.transform = `scaleX(${v.toFixed(4)})`;
    },
    scroller,
  );
  return (
    <div ref={ref} className={"relative w-full " + className} style={style}>
      <div ref={frameRef} className="relative overflow-hidden" style={{ borderRadius: radius }}>
        <div ref={innerRef} className="origin-center">
          {children}
        </div>
      </div>
      {rail ? (
        <span aria-hidden className="mt-3 block h-px w-full overflow-hidden" style={{ background: PAPER.line }}>
          <span ref={railRef} className="block h-full w-full origin-left" style={{ background: PAPER.solid }} />
        </span>
      ) : null}
    </div>
  );
}
