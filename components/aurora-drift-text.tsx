"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";

/**
 * AuroraDriftText — display type filled with aurora light.
 *
 * Three bands of the sky's colours drift through the letters (32s, 38s and
 * 45s loops), fine ray threads slide through them, and a blurred copy
 * behind the words gives the light volume. The brightest band leans to the
 * pointer when it comes near (a ~700ms chase); the others keep drifting.
 * Real text throughout; still under reduced motion.
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

const DISPLAY = 'var(--font-bricolage, "Bricolage Grotesque", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

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

function mixHex(a: string, b: string, k: number): string {
  const x = rgbOf(a);
  const y = rgbOf(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * Math.max(0, Math.min(1, k))));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
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

// Registered positions, so the bands drift on the compositor; the pointer's pull arrives as plain variables.
const DRIFT_CSS =
  "@property --au-d1{syntax:'<percentage>';inherits:true;initial-value:30%}" +
  "@property --au-d2{syntax:'<percentage>';inherits:true;initial-value:70%}" +
  "@property --au-d3{syntax:'<percentage>';inherits:true;initial-value:50%}" +
  "@keyframes au-d1{0%,100%{--au-d1:18%}50%{--au-d1:62%}}" +
  "@keyframes au-d2{0%,100%{--au-d2:84%}50%{--au-d2:38%}}" +
  "@keyframes au-d3{0%,100%{--au-d3:40%}50%{--au-d3:92%}}" +
  "@keyframes au-rays{to{background-position:120px 0,0 0,0 0,0 0,0 0}}" +
  ".au-drift{animation:au-d1 32s ease-in-out infinite,au-d2 38s ease-in-out infinite,au-d3 45s ease-in-out infinite}" +
  ".au-drift-fill{animation:au-rays 32s linear infinite}" +
  "@media (prefers-reduced-motion: reduce){.au-drift,.au-drift-fill{animation:none}}";

export type AuroraDriftTextProps = {
  /** Line breaks stack it. */
  text: string;
  as?: "h1" | "h2" | "p";
  palette?: AuPaletteName;
  align?: "left" | "center";
  className?: string;
  style?: CSSProperties;
};

/**
 * Display type filled with aurora light. Three bands of the sky's colours
 * drift through the letters on their own slow loops (32s, 38s and 45s), fine
 * vertical ray threads slide through them, and a soft blurred copy behind the
 * words gives the light volume. The brightest band leans to the pointer's
 * position when the pointer comes near (a ~700ms chase) and drifts again when
 * it leaves; only that one band follows, so it reads as a sky, not a torch.
 * The words stay real text; under reduced motion the light holds still.
 */
export function AuroraDriftText({ text, as: Tag = "h2", palette = "boreal", align = "left", className, style }: AuroraDriftTextProps) {
  const p = paletteOf(palette);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let raf = 0;
    let last = 0;
    let visible = false;
    const s = { x: 0.5, tx: 0.5, pull: 0, tPull: 0 };
    const tick = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      s.x += (s.tx - s.x) * (1 - Math.exp(-dt * 4));
      s.pull += (s.tPull - s.pull) * (1 - Math.exp(-dt * 3));
      el.style.setProperty("--au-x", `${(s.x * 100).toFixed(2)}%`);
      el.style.setProperty("--au-pull", s.pull.toFixed(3));
      if (visible && (Math.abs(s.tx - s.x) > 0.001 || Math.abs(s.tPull - s.pull) > 0.002)) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!visible) return;
      const r = el.getBoundingClientRect();
      const dy = Math.max(0, Math.abs(e.clientY - (r.top + r.height / 2)) - r.height / 2);
      s.tPull = dy < 180 ? 1 - dy / 180 : 0;
      s.tx = Math.max(-0.1, Math.min(1.1, (e.clientX - r.left) / (r.width || 1)));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      s.tPull = 0;
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
    });
    io.observe(el);
    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  const lead = "calc(var(--au-d1) * (1 - var(--au-pull)) + var(--au-x) * var(--au-pull))";
  const fill = [
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 1px, rgba(255,255,255,0) 1px 6px)",
    `radial-gradient(34% 120% at ${lead} 62%, ${mixHex(p.core, "#ffffff", 0.35)}, ${rgba(p.core, 0)} 72%)`,
    `radial-gradient(40% 110% at var(--au-d2) 40%, ${rgba(p.core2, 0.95)}, ${rgba(p.core2, 0)} 72%)`,
    `radial-gradient(36% 120% at var(--au-d3) 80%, ${rgba(p.blend, 0.9)}, ${rgba(p.blend, 0)} 72%)`,
    "linear-gradient(0deg, rgba(236,244,248,0.5), rgba(236,244,248,0.3))",
  ];
  const lines = text.split("\n");
  const words = lines.map((l, i) => (
    <span key={i} className="block">
      {l}
      {i < lines.length - 1 ? " " : ""}
    </span>
  ));
  const type: CSSProperties = {
    fontFamily: DISPLAY,
    fontWeight: 650,
    fontSize: "clamp(44px, 8cqw, 124px)",
    lineHeight: 1.0,
    letterSpacing: "-0.02em",
    fontVariationSettings: '"opsz" 96',
    textAlign: align,
    textWrap: "balance",
  };
  const clip: CSSProperties = {
    backgroundImage: fill.join(", "),
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  };
  return (
    <Tag
      ref={(n: HTMLElement | null) => {
        ref.current = n;
      }}
      className={"au-scope au-drift relative isolate m-0" + (className ? " " + className : "")}
      style={{ "--au-x": "50%", "--au-pull": "0", color: SKY.ink, ...type, ...style } as CSSProperties}
    >
      <style>{DRIFT_CSS}</style>
      {/* The same words, blurred behind: the light's volume. */}
      <span aria-hidden className="au-drift-fill pointer-events-none absolute inset-0 -z-10 select-none" style={{ ...clip, filter: "blur(18px)", opacity: 0.45 }}>
        {words}
      </span>
      <span className="au-drift-fill block" style={clip}>
        {words}
      </span>
    </Tag>
  );
}
