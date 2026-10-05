"use client";

import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";

/**
 * SlitLightHeading — a heading lit by a slit of light that follows scroll.
 *
 * As the heading scrolls up the viewport a narrow slit of light crosses
 * it from left to right: letters under the slit burn white with a glow in
 * the accent, letters it has passed stay lit, letters ahead wait in the
 * dark. Pass scrollRoot when the heading sits in its own scroller.
 * Reduced motion shows it fully lit.
 *
 * Part of the Dark Precision kit: OLED black, 1px hairlines, one cool accent
 * used only as light (default #4fd1ff; also mint, amber, white or any
 * #rrggbb). Fonts come from CSS variables with Geist fallbacks. Respects
 * prefers-reduced-motion. No dependencies beyond React.
 */

const INK = "rgba(255,255,255,0.92)";

const HEX = /^#[0-9a-fA-F]{6}$/;

export const DP_ACCENTS = {
  ice: "#4fd1ff",
  mint: "#5ef2c1",
  amber: "#ffb45e",
  white: "#f2f4f7",
} as const;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** A named accent or a #rrggbb hex; anything else falls back to ice. */
function accentHex(value: string): string {
  if (own(DP_ACCENTS, value)) return DP_ACCENTS[value];
  return HEX.test(value) ? value : DP_ACCENTS.ice;
}

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
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

export type SlitLightHeadingProps = {
  children: ReactNode;
  accent?: string;
  as?: "h1" | "h2" | "h3";
  id?: string;
  className?: string;
  style?: CSSProperties;
  /** The element that scrolls, if not the window. */
  scrollRoot?: RefObject<HTMLElement | null>;
};

/**
 * A heading lit by a narrow slit of light that follows scroll. Letters the
 * slit has passed stay lit; letters ahead of it wait in the dark.
 */
export function SlitLightHeading({
  children,
  accent = "ice",
  as: Tag = "h2",
  id,
  className,
  style,
  scrollRoot,
}: SlitLightHeadingProps) {
  const acc = accentHex(accent);
  const siteRoot = useContext(ScrollRootContext);
  const rootRef = scrollRoot ?? siteRoot;
  const ref = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = rootRef?.current ?? null;
    const target: HTMLElement | Window = root ?? window;
    let raf = 0;
    const update = () => {
      raf = 0;
      let top: number;
      let vh: number;
      const r = el.getBoundingClientRect();
      if (root) {
        const rr = root.getBoundingClientRect();
        top = r.top - rr.top;
        vh = rr.height;
      } else {
        top = r.top;
        vh = window.innerHeight;
      }
      const k = reduced ? 1 : Math.min(1, Math.max(0, (vh * 0.88 - top) / (vh * 0.5)));
      const p = -12 + k * 124;
      el.style.setProperty("--p", p.toFixed(2) + "%");
      el.style.setProperty("--o", Math.min(1, Math.max(0, Math.min(p, 100 - p) / 10)).toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [rootRef, reduced]);
  const layer: CSSProperties = { position: "absolute", inset: 0, display: "block" };
  return (
    <Tag ref={ref} id={id} className={"relative" + (className ? " " + className : "")} style={{ ...style }}>
      <span className="block" style={{ color: "rgba(255,255,255,0.26)" }}>
        {children}
      </span>
      <span
        aria-hidden
        style={{
          ...layer,
          color: INK,
          WebkitMaskImage: "linear-gradient(90deg, #000 calc(var(--p, 112%) - 7%), transparent calc(var(--p, 112%) + 1%))",
          maskImage: "linear-gradient(90deg, #000 calc(var(--p, 112%) - 7%), transparent calc(var(--p, 112%) + 1%))",
        }}
      >
        {children}
      </span>
      <span
        aria-hidden
        style={{
          ...layer,
          color: "#ffffff",
          textShadow: `0 0 18px ${rgba(acc, 0.7)}, 0 0 2px rgba(255,255,255,0.8)`,
          WebkitMaskImage: "linear-gradient(90deg, transparent calc(var(--p, 112%) - 3.5%), #000 var(--p, 112%), transparent calc(var(--p, 112%) + 3.5%))",
          maskImage: "linear-gradient(90deg, transparent calc(var(--p, 112%) - 3.5%), #000 var(--p, 112%), transparent calc(var(--p, 112%) + 3.5%))",
        }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: "-14%",
          bottom: "-14%",
          left: "var(--p, 112%)",
          width: 1,
          background: `linear-gradient(180deg, transparent, ${rgba(acc, 0.9)} 30%, #ffffff 50%, ${rgba(acc, 0.9)} 70%, transparent)`,
          boxShadow: `0 0 14px 1px ${rgba(acc, 0.55)}`,
          opacity: "var(--o, 0)",
        }}
      />
    </Tag>
  );
}
