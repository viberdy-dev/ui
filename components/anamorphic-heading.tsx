"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, RefObject } from "react";

/**
 * AnamorphicHeading — a heading that only reads from the right angle.
 *
 * Its letters stand at different depths, each scaled and shifted so that from
 * straight ahead they line up exactly; from anywhere else they scatter in
 * parallax. As the heading rises into view the view swings round from 36
 * degrees to square and the words resolve; the pointer leans it and they
 * part again. Real text; reduced motion shows it square. CSS 3D.
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

const DISPLAY = 'var(--font-hanken, "Hanken Grotesk", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

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

/** The element that scrolls: null for the window, or the site itself in "self" mode. */
const ScrollRootContext = createContext<RefObject<HTMLElement | null> | null>(null);

/** How far an element has come through the view: 0 as its top meets the bottom, 1 as its bottom meets the top. */
function throughView(el: HTMLElement, root: HTMLElement | null): number {
  const r = el.getBoundingClientRect();
  const top = root ? root.getBoundingClientRect().top : 0;
  const h = root ? root.clientHeight : window.innerHeight;
  return clamp((top + h - r.top) / Math.max(1, h + r.height), 0, 1);
}

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

const ANA_P = 900;

/** A fixed depth per letter, -1 to 1 (from its index, so it is the same on every visit). */
function depthOf(i: number): number {
  const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function smooth01(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

export type AnamorphicHeadingProps = {
  /** The heading, one entry per line. */
  lines: string[];
  as?: "h1" | "h2" | "h3" | "p";
  /** How far the letters stand apart in depth (1 = up to 240px either side). */
  depth?: number;
  /** How far round the view starts, degrees. */
  angle?: number;
  /** Where the reveal is, 0-1, instead of the heading's place on the screen. */
  progress?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * A heading that only reads from the right angle. Its letters stand at
 * different depths (up to 240px in front of and behind the page), each scaled
 * and shifted so that from straight ahead they line up exactly into the words;
 * from anywhere else they scatter in parallax. As the heading comes up the
 * screen the view swings from 36 degrees round to square and the words
 * resolve; the pointer leans the view a few degrees and they part again. Real
 * text, named once for screen readers; reduced motion shows it square.
 */
export function AnamorphicHeading({ lines, as = "h2", depth = 1, angle = 36, progress, className, style }: AnamorphicHeadingProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLSpanElement>(null);
  const scrollRoot = useContext(ScrollRootContext);
  const reduced = useReducedMotion();
  const [view, setView] = useState({ q: progress ?? 0, px: 0, py: 0 });

  // Place every letter: at its depth, scaled back to its own size and shifted back onto its own spot as seen from the front.
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const place = () => {
      const cx = group.offsetWidth / 2;
      const cy = group.offsetHeight / 2;
      group.querySelectorAll<HTMLElement>("[data-s3-g]").forEach((el, i) => {
        const z = depthOf(i) * 240 * depth;
        const s = (ANA_P - z) / ANA_P;
        const x = el.offsetLeft + el.offsetWidth / 2 - cx;
        const y = el.offsetTop + el.offsetHeight / 2 - cy;
        el.style.transform = `translate3d(${(x * (s - 1)).toFixed(2)}px, ${(y * (s - 1)).toFixed(2)}px, ${z.toFixed(1)}px) scale(${s.toFixed(4)})`;
      });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(group);
    document.fonts?.ready.then(place);
    return () => ro.disconnect();
  }, [lines, depth]);

  // The view swings round to square as the heading rises to the middle of the screen.
  useEffect(() => {
    if (progress !== undefined) return;
    const root = scrollRoot?.current ?? null;
    const update = () => {
      const el = hostRef.current;
      if (el) setView((v) => ({ ...v, q: throughView(el, root) }));
    };
    const id = requestAnimationFrame(update);
    const off = onScrollOf(root, update);
    return () => {
      cancelAnimationFrame(id);
      off();
    };
  }, [progress, scrollRoot]);

  const q = progress ?? view.q;
  const turn = reduced ? 0 : angle * (1 - smooth01(q * 2.8 - 0.2)) + view.px * 10;
  const tilt = reduced ? 0 : -view.py * 6;
  const Tag = as;
  return (
    <div
      ref={hostRef}
      className={"relative " + (className ?? "")}
      style={style}
      onPointerMove={(e) => {
        if (reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        setView((v) => ({ ...v, px: (e.clientX - r.left) / r.width - 0.5, py: (e.clientY - r.top) / r.height - 0.5 }));
      }}
      onPointerLeave={() => setView((v) => ({ ...v, px: 0, py: 0 }))}
    >
      <Tag aria-label={lines.join(" ")} className="m-0 font-bold" style={{ fontFamily: DISPLAY, perspective: ANA_P }}>
        <span ref={groupRef} aria-hidden className="relative block" style={{ transformStyle: "preserve-3d", transform: `rotateY(${turn.toFixed(2)}deg) rotateX(${tilt.toFixed(2)}deg)`, transition: `transform 260ms ${EASE}` }}>
          {lines.map((line, li) => (
            <span key={li} className="block whitespace-nowrap" style={{ transformStyle: "preserve-3d" }}>
              {Array.from(line).map((ch, ci) => (
                <span key={ci} data-s3-g="" className="inline-block whitespace-pre" style={{ transformStyle: "preserve-3d" }}>
                  {ch}
                </span>
              ))}
            </span>
          ))}
        </span>
      </Tag>
    </div>
  );
}
