"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

/**
 * SquishFlip — a list whose items squash and stretch as they move to their new places.
 *
 * Reorder, filter or add items and each travels on a spring, stretched
 * along its path by its speed (area kept), squashing as it lands. New
 * items pop in from small. Any keyed list: items, a key, a render function.
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

type TmFlipState = { x: number; y: number; vx: number; vy: number; s: number; sv: number; th: number; pop: number; popv: number };

/**
 * SquishFlip — a list whose items squash and stretch as they move to their
 * new places.
 *
 * Reorder, filter or add items and each one travels from where it was to
 * where it is now on a spring, stretched along its path in proportion to its
 * speed (its area kept: longer means thinner), then squashes as it lands and
 * settles, one overshoot, inside ~450ms. New items pop in from small. Works
 * for any keyed list: pass the items, a key and a render function. Reduced
 * motion moves them instantly.
 */
export function SquishFlip<T>({
  items,
  getKey,
  render,
  className = "",
  itemClassName = "",
  label,
}: {
  items: T[];
  getKey: (item: T) => string;
  render: (item: T) => ReactNode;
  className?: string;
  itemClassName?: string;
  /** An accessible name for the list. */
  label?: string;
}) {
  const reduced = useReducedMotion();
  const els = useRef(new Map<string, HTMLLIElement>());
  const prev = useRef(new Map<string, { x: number; y: number }>());
  const sim = useRef(new Map<string, TmFlipState>());
  const loop = useRef({ raf: 0, last: 0 });
  const tickRef = useRef<(now: number) => void>(() => undefined);
  const keys = items.map(getKey).join("|");

  useEffect(() => {
    const lp = loop.current;
    tickRef.current = (now: number) => {
      lp.raf = 0;
      const dt = lp.last ? Math.min(1 / 30, (now - lp.last) / 1000) : 1 / 60;
      lp.last = now;
      let moving = false;
      sim.current.forEach((st, key) => {
        for (let i = 0; i < 3; i++) {
          const h = dt / 3;
          // Travel: k 260, c 24. Stretch follows speed on its own spring (k 520, c 18), so it overshoots into a squash on landing.
          st.vx += (-260 * st.x - 24 * st.vx) * h;
          st.vy += (-260 * st.y - 24 * st.vy) * h;
          st.x += st.vx * h;
          st.y += st.vy * h;
          const speed = Math.hypot(st.vx, st.vy);
          st.sv += (520 * (1 + Math.min(0.32, speed * 0.00042) - st.s) - 18 * st.sv) * h;
          st.s += st.sv * h;
          st.popv += (420 * (1 - st.pop) - 18 * st.popv) * h;
          st.pop += st.popv * h;
          if (speed > 30) st.th = Math.atan2(st.vy, st.vx);
        }
        const el = els.current.get(key);
        const done = Math.abs(st.x) + Math.abs(st.y) < 0.2 && Math.abs(st.vx) + Math.abs(st.vy) < 2 && Math.abs(st.s - 1) < 0.002 && Math.abs(st.sv) < 0.02 && Math.abs(st.pop - 1) < 0.002 && Math.abs(st.popv) < 0.02;
        if (el) {
          const deg = (st.th * 180) / Math.PI;
          el.style.transform = done
            ? ""
            : `translate(${st.x.toFixed(2)}px, ${st.y.toFixed(2)}px) rotate(${deg.toFixed(2)}deg) scale(${(st.s * st.pop).toFixed(4)}, ${(st.pop / st.s).toFixed(4)}) rotate(${(-deg).toFixed(2)}deg)`;
        }
        if (done) sim.current.delete(key);
        else moving = true;
      });
      if (moving) lp.raf = requestAnimationFrame((n) => tickRef.current(n));
      else lp.last = 0;
    };
    return () => {
      cancelAnimationFrame(lp.raf);
      lp.raf = 0;
      lp.last = 0;
    };
  }, []);

  // After every layout change: where did each item come from? Start it there and let it spring home.
  useLayoutEffect(() => {
    const next = new Map<string, { x: number; y: number }>();
    els.current.forEach((el, key) => {
      if (!el.isConnected) {
        els.current.delete(key);
        return;
      }
      // Measure without the running transform.
      const st = sim.current.get(key);
      const x = el.offsetLeft;
      const y = el.offsetTop;
      next.set(key, { x, y });
      const was = prev.current.get(key);
      if (reduced) return;
      if (!was) {
        if (prev.current.size) sim.current.set(key, { x: 0, y: 0, vx: 0, vy: 0, s: 1, sv: 0, th: 0, pop: 0.35, popv: 0 });
        return;
      }
      const dx = was.x + (st?.x ?? 0) - x;
      const dy = was.y + (st?.y ?? 0) - y;
      if (Math.abs(dx) + Math.abs(dy) < 0.5 && !st) return;
      sim.current.set(key, { x: dx, y: dy, vx: st?.vx ?? 0, vy: st?.vy ?? 0, s: st?.s ?? 1, sv: st?.sv ?? 0, th: st?.th ?? Math.atan2(-dy, -dx), pop: st?.pop ?? 1, popv: st?.popv ?? 0 });
    });
    prev.current = next;
    const lp = loop.current;
    if (sim.current.size && !lp.raf) lp.raf = requestAnimationFrame((n) => tickRef.current(n));
  }, [keys, reduced]);

  return (
    <ul aria-label={label} className={"tm-scope relative m-0 flex list-none flex-wrap p-0 " + className}>
      {items.map((item) => {
        const key = getKey(item);
        return (
          <li
            key={key}
            ref={(el) => {
              if (el) els.current.set(key, el);
            }}
            className={"relative " + itemClassName}
            style={{ willChange: "transform", transition: "none" }}
          >
            {render(item)}
          </li>
        );
      })}
    </ul>
  );
}
