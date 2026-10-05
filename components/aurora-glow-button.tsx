"use client";

import { useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

/**
 * AuroraGlowButton — a night-glass pill with a sliver of aurora under it.
 *
 * The under-glow turns through the palette on one 60s clock that every
 * button on the page shares (the phase comes from the page's own timeline),
 * so they glow in step. Hover or focus lets the glow spread (220ms); a
 * press sends a ring of light out from the pill (380ms); the top edge
 * carries a thin lit rim. Solid or quiet. Renders a link when given an
 * href, else a button.
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

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

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
 * The aurora clock: every lit part of the page reads one 60s cycle, so a
 * button, a rim and the sky drift together instead of breathing out of step.
 * The phase is the page's own timeline (performance.now), shared by
 * everything on it.
 */
const CLOCK_S = 60;

/**
 * A ref callback that starts an element's CSS animation where the clock
 * already is, so parts that mount at different moments stay in step.
 */
function syncClock(periodS: number) {
  return (el: HTMLElement | null) => {
    if (el) el.style.animationDelay = `${(-(performance.now() / 1000) % periodS).toFixed(3)}s`;
  };
}

/** Links: strip tabs and newlines, refuse backslashes, allow http(s), mailto, tel and same-site paths. */
function safeHref(raw: string): string {
  const v = raw.replace(/[\t\n\r]/g, "").trim();
  if (!v || v.includes("\\")) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#?]/.test(v) && !/^\/\//.test(v)) return v;
  return "#";
}

// Each part carries only the CSS it needs, so any one of them works on its own.
// Nothing is interpolated into these sheets; colours arrive as CSS variables.
// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".au-scope :focus-visible,.au-scope:focus-visible{outline:2px solid var(--au-ring,#7cf5c4);outline-offset:3px;border-radius:revert-layer}";

/** The palette as CSS variables, for the parts drawn in CSS. */
function paletteVars(p: AuPalette): CSSProperties {
  return { "--au-core": p.core, "--au-core2": p.core2, "--au-blend": p.blend, "--au-high": p.high, "--au-ring": p.core } as CSSProperties;
}

// A registered angle, so the under-glow turns on the compositor without a render per frame.
const GLOW_BTN_CSS =
  "@property --au-a{syntax:'<angle>';inherits:false;initial-value:0deg}" +
  "@keyframes au-turn{to{--au-a:360deg}}" +
  "@keyframes au-ring{from{opacity:.9;transform:scale(1)}to{opacity:0;transform:scale(1.18,1.5)}}" +
  ".au-glow{inset:-6px -8px -12px;opacity:.55;animation:au-turn 60s linear infinite}" +
  ".au-btn:hover .au-glow,.au-btn:focus-visible .au-glow{inset:-12px -14px -18px;opacity:.85}" +
  ".au-q .au-glow{opacity:0}.au-q:hover .au-glow,.au-q:focus-visible .au-glow{opacity:.4}" +
  ".au-btn:active{transform:translateY(1px) scale(.985)}" +
  "@media (prefers-reduced-motion: reduce){.au-glow{animation:none}.au-ring{animation:none!important;opacity:0}}";

export type AuroraGlowButtonProps = {
  children: ReactNode;
  /** Renders a link when given, else a button. */
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  /** "solid" carries the sky under it; "quiet" is a hairline pill whose light wakes on hover. */
  variant?: "solid" | "quiet";
  size?: "md" | "lg";
  palette?: AuPaletteName;
  disabled?: boolean;
  className?: string;
};

/**
 * A pill with a sliver of the sky under it. The under-glow is a slow turn
 * through the palette on the page's 60s aurora clock, so every button on the
 * page glows in step with the sky; hover or focus lets it spread (220ms), and
 * a press (or Enter or Space) sends a ring of light out from the pill (380ms). The top edge
 * carries a thin lit rim. Renders a link when given an href, else a button.
 */
export function AuroraGlowButton({ children, href, onClick, type = "button", variant = "solid", size = "md", palette = "boreal", disabled, className }: AuroraGlowButtonProps) {
  const p = paletteOf(palette);
  const [ring, setRing] = useState(0);
  const solid = variant === "solid";
  const cls =
    "au-scope au-btn relative isolate inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[transform,color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50 " +
    (size === "lg" ? "h-[52px] px-7 text-[15px]" : "h-11 px-5 text-[14px]") +
    (solid ? "" : " au-q") +
    (className ? " " + className : "");
  const style: CSSProperties = {
    ...paletteVars(p),
    color: SKY.ink,
    fontFamily: SANS,
    background: solid ? `linear-gradient(180deg, ${SKY.raised}, ${SKY.panel})` : "transparent",
    boxShadow: solid ? `inset 0 0 0 1px ${SKY.line2}, 0 10px 30px -12px rgba(0,0,0,0.8)` : `inset 0 0 0 1px ${SKY.line2}`,
  };
  const sheet = <style>{FOCUS_CSS + GLOW_BTN_CSS}</style>;
  const inner = (
    <>
      {/* The sky under the pill, turning on the aurora clock. */}
      <span
        ref={syncClock(CLOCK_S)}
        aria-hidden
        className="au-glow pointer-events-none absolute -z-10 rounded-full transition-[inset,opacity] duration-200"
        style={{
          background: "conic-gradient(from var(--au-a), var(--au-core), var(--au-core2), var(--au-blend), var(--au-core2), var(--au-core))",
          filter: "blur(14px)",
        }}
      />
      {/* A lit rim along the top edge. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          padding: 1,
          background: `linear-gradient(90deg, transparent 12%, ${rgba(p.core, solid ? 0.7 : 0.35)} 40%, ${rgba(p.core2, solid ? 0.6 : 0.3)} 62%, transparent 88%) top / 100% 1px no-repeat`,
        }}
      />
      {ring > 0 && (
        <span
          key={ring}
          aria-hidden
          className="au-ring pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 0 1px ${rgba(p.core, 0.8)}, 0 0 24px ${rgba(p.core2, 0.5)}`, animation: `au-ring 380ms ${EASE} both` }}
        />
      )}
      <span className="relative">{children}</span>
    </>
  );
  const onDown = () => {
    if (!disabled) setRing((r) => r + 1);
  };
  const onKey = (e: ReactKeyboardEvent) => {
    if (!e.repeat && (e.key === "Enter" || e.key === " ")) onDown();
  };
  if (href !== undefined) {
    return (
      <>
        {sheet}
        <a href={safeHref(href)} onClick={onClick} onPointerDown={onDown} onKeyDown={onKey} className={cls} style={style}>
          {inner}
        </a>
      </>
    );
  }
  return (
    <>
      {sheet}
      <button type={type} onClick={onClick} onPointerDown={onDown} onKeyDown={onKey} disabled={disabled} className={cls} style={style}>
        {inner}
      </button>
    </>
  );
}
