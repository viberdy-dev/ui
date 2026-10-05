"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * AssembleReveal — parts that assemble as they come into view.
 *
 * Each item starts at its own fixed offset and turn in 3D perspective and
 * flies home on a spring with a slight overshoot, one after another; it
 * renders in place first and only scatters once it can animate, so nothing is
 * hidden without script. On view, once or every time, or on a prop. CSS 3D.
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

/** A part's starting pose: a fixed offset and turn in 3D, from its index. */
function scatterOf(i: number, distance: number): string {
  const h = (k: number) => {
    const x = Math.sin(i * 91.3458 + k * 47.123) * 24634.6345;
    return (x - Math.floor(x)) * 2 - 1;
  };
  return `translate3d(${(h(1) * 140 * distance).toFixed(1)}px, ${(h(2) * 90 * distance + 40).toFixed(1)}px, ${(-220 + h(3) * 180 * distance).toFixed(1)}px) rotateX(${(h(4) * 50).toFixed(1)}deg) rotateY(${(h(5) * 60).toFixed(1)}deg) rotateZ(${(h(6) * 14).toFixed(1)}deg)`;
}

export type AssembleRevealProps = {
  /** The parts, in the order they arrive. */
  items: ReactNode[];
  /** Delay between parts, ms. */
  stagger?: number;
  /** How far out the parts start (1 = about 140px across and 220px deep). */
  distance?: number;
  /** Assemble once, or come apart again each time it leaves the view. */
  once?: boolean;
  /** Assemble now, instead of on view. */
  play?: boolean;
  className?: string;
  itemClassName?: string;
  style?: CSSProperties;
};

/**
 * Parts that assemble as they come into view. Each item starts at its own
 * fixed offset and turn in real 3D perspective (deep behind the page and
 * off to one side) and flies home on a spring with a slight overshoot
 * (900ms), one after another; opacity follows in 500ms. Everything renders in
 * place first and only scatters once it can animate, so nothing is ever
 * hidden without script. Reduced motion shows the parts assembled.
 */
export function AssembleReveal({ items, stagger = 70, distance = 1, once = true, play, className, itemClassName, style }: AssembleRevealProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"static" | "armed" | "in">("static");
  const reduced = useReducedMotion();
  const controlled = play !== undefined;

  useEffect(() => {
    if (reduced) return;
    const el = hostRef.current;
    if (!el) return;
    let a = 0;
    let b = 0;
    // Scatter, let that paint, then send the parts home.
    const assemble = () => {
      a = requestAnimationFrame(() => {
        setPhase("armed");
        b = requestAnimationFrame(() => {
          b = requestAnimationFrame(() => setPhase("in"));
        });
      });
    };
    if (controlled) {
      if (play) assemble();
      else a = requestAnimationFrame(() => setPhase("armed"));
      return () => {
        cancelAnimationFrame(a);
        cancelAnimationFrame(b);
      };
    }
    let done = false;
    const io = new IntersectionObserver(
      (entries) => {
        const v = entries[entries.length - 1].isIntersecting;
        if (v && !done) {
          done = once;
          assemble();
        } else if (!v && (!once || !done)) setPhase("armed");
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, [reduced, controlled, play, once]);

  return (
    <div ref={hostRef} className={className} style={{ perspective: 1100, ...style }}>
      {items.map((item, i) => {
        const out = phase === "armed";
        return (
          <div
            key={i}
            className={itemClassName}
            style={{
              transform: out ? scatterOf(i, distance) : "none",
              opacity: out ? 0 : 1,
              transition: phase === "in" ? `transform 900ms cubic-bezier(.2,1.25,.3,1) ${i * stagger}ms, opacity 500ms ease ${i * stagger}ms` : "none",
            }}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}
