"use client";

import { useSyncExternalStore } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * AuroraRimCard — a card with a slow aurora rim.
 *
 * A conic sweep through the sky's colours turns once every 52s around a
 * night-glass card, feathered so it reads as light on an edge, with a faint
 * halo outside it. Near the pointer the rim runs brighter and the halo
 * lifts (380ms), and the card tilts at most 1.5 degrees toward the pointer.
 * Content goes in as children.
 *
 * Part of the Aurora kit: a near-black night (#050608) lit by curtains of
 * aurora in mint #7cf5c4 and sky #38bdf8, a violet #a78bfa blend, a rose
 * #f472b6 crown and an indigo #5b6cc4 fringe, all on one 60s clock; Bricolage
 * Grotesque through var(--font-bricolage) for lit display type over Geist.
 * Respects prefers-reduced-motion. No dependencies beyond React. Paste it as
 * its own file: it repeats the kit's small helpers, which would clash in one
 * module. For the display face, load Bricolage Grotesque with next/font
 * (variable: "--font-bricolage") on a parent; elsewhere, load it with a
 * Google Fonts link or @fontsource and set --font-bricolage yourself.
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The night the kit is set in. */
const SKY = {
  ground: "#050608",
  panel: "#0a0d12",
  raised: "#0f141a",
  ink: "rgba(236,244,248,0.94)",
  ink2: "rgba(236,244,248,0.64)",
  ink3: "rgba(236,244,248,0.42)",
  line: "rgba(236,244,248,0.08)",
  line2: "rgba(236,244,248,0.16)",
  shadow: "0 40px 100px -30px rgba(0,0,0,0.7)",
} as const;

/**
 * The sky's colours by altitude: the core low in the curtain (two hues it
 * drifts between on the aurora clock), a violet blend above it, a rose crown
 * seen only in a strong display, and an indigo fringe under the lower border.
 */
export type AuPalette = { core: string; core2: string; blend: string; high: string; fringe: string };

export const AU_PALETTES = {
  boreal: { core: "#7cf5c4", core2: "#38bdf8", blend: "#a78bfa", high: "#f472b6", fringe: "#5b6cc4" },
  verdant: { core: "#6ee7a0", core2: "#7cf5c4", blend: "#8fb4f0", high: "#e879b9", fringe: "#5b6cc4" },
  violet: { core: "#a78bfa", core2: "#38bdf8", blend: "#c4a6fb", high: "#f472b6", fringe: "#4c5bb8" },
} as const satisfies Record<string, AuPalette>;

export type AuPaletteName = keyof typeof AU_PALETTES;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** A named palette, or boreal. */
function paletteOf(name: string): AuPalette {
  return own(AU_PALETTES, name) ? AU_PALETTES[name] : AU_PALETTES.boreal;
}

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt((HEX.test(hex) ? hex : "#7cf5c4").slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * A ref callback that starts an element's CSS animation where the clock
 * already is, so parts that mount at different moments stay in step.
 */
function syncClock(periodS: number) {
  return (el: HTMLElement | null) => {
    if (el) el.style.animationDelay = `${(-(performance.now() / 1000) % periodS).toFixed(3)}s`;
  };
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

// Each part carries only the CSS it needs, so any one of them works on its own.
// Nothing is interpolated into these sheets; colours arrive as CSS variables.
// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".au-scope :focus-visible,.au-scope:focus-visible{outline:2px solid var(--au-ring,#7cf5c4);outline-offset:3px;border-radius:revert-layer}";

/** The palette as CSS variables, for the parts drawn in CSS. */
function paletteVars(p: AuPalette): CSSProperties {
  return { "--au-core": p.core, "--au-core2": p.core2, "--au-blend": p.blend, "--au-high": p.high, "--au-ring": p.core } as CSSProperties;
}

const RIM_CSS =
  "@property --au-rim{syntax:'<angle>';inherits:true;initial-value:0deg}" +
  "@keyframes au-rim{to{--au-rim:360deg}}" +
  ".au-rimcard{animation:au-rim 52s linear infinite;transition:transform 380ms cubic-bezier(0.22,1,0.36,1)}" +
  ".au-rimcard .au-rim-hot{opacity:0;transition:opacity 380ms cubic-bezier(0.22,1,0.36,1)}" +
  ".au-rimcard:hover .au-rim-hot,.au-rimcard:focus-within .au-rim-hot{opacity:1}" +
  ".au-rim-halo{opacity:.16}.au-rimcard:hover .au-rim-halo,.au-rimcard:focus-within .au-rim-halo{opacity:.34}" +
  "@media (prefers-reduced-motion: reduce){.au-rimcard{animation:none;transition:none;transform:none!important}}";

const RING_MASK: CSSProperties = {
  padding: 1.5,
  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  maskComposite: "exclude",
};

export type AuroraRimCardProps = {
  children: ReactNode;
  palette?: AuPaletteName;
  /** Tilt a hair toward the pointer. */
  tilt?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * A night-glass card with a slow aurora rim: a conic sweep through the sky's
 * colours turning once every 52s, feathered so it reads as light on an edge
 * rather than a coloured border, with a faint halo of the same light outside
 * it. Near the pointer the rim runs brighter and the halo lifts (380ms), and
 * the card tilts at most 1.5 degrees toward the pointer. Content goes in as
 * children; the rim, halo and tilt never touch it.
 */
export function AuroraRimCard({ children, palette = "boreal", tilt = true, className, style }: AuroraRimCardProps) {
  const p = paletteOf(palette);
  const reduced = useReducedMotion();
  const cone = `conic-gradient(from var(--au-rim), ${p.core}, ${p.core2}, ${p.blend}, ${rgba(p.high, 0.7)}, ${p.core2}, ${p.core})`;
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / (r.width || 1);
    const y = (e.clientY - r.top) / (r.height || 1);
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    if (tilt && !reduced) el.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 3).toFixed(2)}deg) rotateY(${((x - 0.5) * 3).toFixed(2)}deg)`;
  };
  const onLeave = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "";
  };
  return (
    <div
      ref={syncClock(52)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={"au-scope au-rimcard relative isolate rounded-[22px]" + (className ? " " + className : "")}
      style={{ ...paletteVars(p), "--mx": "50%", "--my": "0%", color: SKY.ink, fontFamily: SANS, boxShadow: SKY.shadow, ...style } as CSSProperties}
    >
      <style>{FOCUS_CSS + RIM_CSS}</style>
      {/* A faint halo of the rim's light outside the card. */}
      <span aria-hidden className="au-rim-halo pointer-events-none absolute -inset-[2px] rounded-[24px] transition-opacity duration-300" style={{ background: cone, filter: "blur(16px)" }} />
      {/* The card's own surface, over the halo, so the light stays outside it. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[22px]" style={{ background: SKY.panel }} />
      {/* The rim itself, feathered. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[22px]" style={{ ...RING_MASK, background: cone, opacity: 0.8, filter: "blur(0.6px)" }} />
      {/* Brighter where the pointer is. */}
      <span
        aria-hidden
        className="au-rim-hot pointer-events-none absolute inset-0 rounded-[22px]"
        style={{ WebkitMaskImage: "radial-gradient(180px circle at var(--mx) var(--my), #000, transparent 70%)", maskImage: "radial-gradient(180px circle at var(--mx) var(--my), #000, transparent 70%)" }}
      >
        <span className="absolute inset-0 rounded-[22px]" style={{ ...RING_MASK, padding: 2, background: cone, filter: "blur(1px) brightness(1.4)" }} />
      </span>
      <div className="relative">{children}</div>
    </div>
  );
}
