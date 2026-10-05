"use client";

import { useSyncExternalStore } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * PointerLitCard — a card lit from the pointer.
 *
 * A bright arc of light on the hairline border and a softer wash across
 * the surface follow the pointer, the card tilts a couple of degrees toward
 * it, and the content drifts a few pixels the other way. Keyboard focus
 * inside lights it from the top. The pointer position is written to CSS
 * variables, so twenty cards cost no re-renders.
 *
 * Part of the Dark Precision kit: OLED black, 1px hairlines, one cool accent
 * used only as light (default #4fd1ff; also mint, amber, white or any
 * #rrggbb). Fonts come from CSS variables with Geist fallbacks. Respects
 * prefers-reduced-motion. No dependencies beyond React.
 */

const SURFACE = "#0b0b0d";

const LINE_2 = "rgba(255,255,255,0.14)";

const MORPH = "cubic-bezier(0.16, 1, 0.3, 1)";

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

export type PointerLitCardProps = {
  children: ReactNode;
  accent?: string;
  tilt?: number;
  radius?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * A card lit from the pointer: a bright arc on the hairline border, a softer
 * wash across the surface, a tilt of a couple of degrees and a little
 * parallax on the content. Keyboard focus inside lights it from the top.
 */
export function PointerLitCard({
  children,
  accent = "ice",
  tilt = 2,
  radius = 16,
  className,
  style,
}: PointerLitCardProps) {
  const acc = accentHex(accent);
  const reduced = useReducedMotion();
  const set = (el: HTMLElement, v: Record<string, string>) => {
    for (const k in v) el.style.setProperty(k, v[k]);
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / (r.width || 1)));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / (r.height || 1)));
    set(el, { "--mx": (x * 100).toFixed(2) + "%", "--my": (y * 100).toFixed(2) + "%", "--lit": "1", "--td": "180ms" });
    if (!reduced && tilt > 0) {
      set(el, {
        "--rx": ((0.5 - y) * tilt * 2).toFixed(3) + "deg",
        "--ry": ((x - 0.5) * tilt * 2).toFixed(3) + "deg",
        "--px": ((0.5 - x) * 6).toFixed(2) + "px",
        "--py": ((0.5 - y) * 6).toFixed(2) + "px",
      });
    }
  };
  const rest = (el: HTMLElement) => set(el, { "--lit": "0", "--rx": "0deg", "--ry": "0deg", "--px": "0px", "--py": "0px", "--td": "600ms" });
  return (
    <div
      onPointerMove={move}
      onPointerLeave={(e) => rest(e.currentTarget)}
      onFocus={(e) => set(e.currentTarget, { "--mx": "50%", "--my": "0%", "--lit": "1" })}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) rest(e.currentTarget);
      }}
      className={"relative" + (className ? " " + className : "")}
      style={{
        borderRadius: radius,
        padding: 1,
        background: LINE_2,
        transform: "perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
        transition: `transform var(--td, 600ms) ${MORPH}`,
        ...style,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: radius,
          background: `radial-gradient(240px circle at var(--mx, 50%) var(--my, 0%), ${rgba(acc, 0.9)}, ${rgba(acc, 0.25)} 40%, transparent 72%)`,
          opacity: "var(--lit, 0)",
          transition: "opacity 300ms ease",
        }}
      />
      <div className="relative h-full overflow-hidden" style={{ borderRadius: radius - 1, background: SURFACE }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(380px circle at var(--mx, 50%) var(--my, 0%), rgba(255,255,255,0.075), transparent 62%), radial-gradient(640px circle at var(--mx, 50%) var(--my, 0%), ${rgba(acc, 0.05)}, transparent 70%)`,
            opacity: "var(--lit, 0)",
            transition: "opacity 300ms ease",
          }}
        />
        <div className="relative h-full" style={{ transform: "translate3d(var(--px, 0px), var(--py, 0px), 0)", transition: `transform var(--td, 600ms) ${MORPH}` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
