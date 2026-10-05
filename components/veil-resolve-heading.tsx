"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, RefObject } from "react";

/**
 * VeilResolveHeading — a serif heading that arrives out of soft light.
 *
 * When it scrolls into view each word condenses from a blur into focus,
 * rising a hair as it sharpens, with an 80ms stagger, while a soft glow
 * blooms behind the words and fades once they are sharp. It plays once.
 * Line breaks stack it and *asterisks* set words in italic; punctuation
 * stays with its word. The words are real text throughout; without script
 * or under reduced motion it is simply there.
 *
 * Part of the Diffused Glow kit: a warm bone day (#f6f1e6) and a jade room
 * (#0b120f); soft, grained halos in gold, rose or jade (or any #rrggbb), at
 * most two per view; a serif through var(--font-serif) over Geist. Respects
 * prefers-reduced-motion. No dependencies beyond React. Paste it as its own
 * file: it repeats the kit's small helpers, which would clash in one module.
 * For the serif, load Fraunces with next/font (variable: "--font-serif") on a parent.
 */

const SERIF = 'var(--font-serif, "Fraunces", "Iowan Old Style", "Palatino Linotype", Georgia, serif)';

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const RESOLVE = "cubic-bezier(0.16, 1, 0.3, 1)";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The two grounds the kit is set on: the warm day and the jade room. */
const TONES = {
  day: {
    ground: "#f6f1e6",
    panel: "#efe7d6",
    raised: "#fbf8f1",
    ink: "rgba(34,31,26,0.92)",
    ink2: "rgba(34,31,26,0.58)",
    ink3: "rgba(34,31,26,0.4)",
    line: "rgba(34,31,26,0.09)",
    line2: "rgba(34,31,26,0.18)",
    shadow: "0 30px 80px -20px rgba(40,30,10,0.14)",
  },
  jewel: {
    ground: "#0b120f",
    panel: "#101c17",
    raised: "#16261f",
    ink: "rgba(243,237,226,0.94)",
    ink2: "rgba(243,237,226,0.63)",
    ink3: "rgba(243,237,226,0.4)",
    line: "rgba(243,237,226,0.08)",
    line2: "rgba(243,237,226,0.16)",
    shadow: "0 40px 100px -24px rgba(0,0,0,0.5)",
  },
} as const;

export type DgTone = keyof typeof TONES;

/** Halo colours. Gold and rose belong to the jade room; jade is the day's own light. */
export const DG_GLOWS = {
  gold: "#f5c48c",
  rose: "#f2a39a",
  jade: "#bcd9c8",
} as const;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** A named glow or a #rrggbb; anything else falls back to gold. */
function glowHex(value: string): string {
  if (own(DG_GLOWS, value)) return DG_GLOWS[value];
  return HEX.test(value) ? value : DG_GLOWS.gold;
}

function toneOf(value: string) {
  return own(TONES, value) ? TONES[value] : TONES.day;
}

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Grain as an SVG turbulence tile. It is only ever laid inside a light (masked
 * to the halo's shape), never over the whole page: grain belongs to the glow.
 */
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.9 0'/></filter><rect width='160' height='160' filter='url(#g)'/></svg>",
)}")`;

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

const VEIL_CSS =
  "@keyframes dg-veil{0%{opacity:0;filter:blur(14px);transform:translateY(0.12em)}60%{opacity:1}100%{opacity:1;filter:blur(0);transform:none}}" +
  "@keyframes dg-veil-glow{0%{opacity:0}35%{opacity:1}100%{opacity:0}}" +
  "@media (prefers-reduced-motion: reduce){.dg-veil,.dg-veil-glow{animation:none!important;opacity:1!important;filter:none!important;transform:none!important}.dg-veil-glow{opacity:0!important}}";

type Word = { text: string; italic: boolean; line: number; glue: boolean };

/** Words with their line, whether they sit inside *asterisks*, and whether they follow the last word with no space ("for*." keeps its full stop). */
function wordsOf(text: string): Word[] {
  const out: Word[] = [];
  text.split("\n").forEach((line, li) => {
    let spaced = true;
    line.split(/(\*[^*]+\*)/g).forEach((part) => {
      const italic = part.startsWith("*") && part.endsWith("*") && part.length > 2;
      const body = italic ? part.slice(1, -1) : part;
      body.split(/(\s+)/).forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) {
          spaced = true;
          return;
        }
        out.push({ text: tok, italic, line: li, glue: !spaced && out.length > 0 && out[out.length - 1].line === li });
        spaced = false;
      });
    });
  });
  return out;
}

export type VeilResolveHeadingProps = {
  /** Line breaks stack it; *asterisks* set words in italic. */
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  tone?: DgTone;
  glow?: string;
  align?: "left" | "center";
  className?: string;
  style?: CSSProperties;
};

/**
 * A serif heading that arrives out of soft light. When it scrolls into view,
 * each word condenses from a blur into focus, rising a hair as it sharpens,
 * one after another with an 80ms stagger; a soft glow blooms behind the words
 * as they form and fades once they are sharp, as if the light had turned into
 * type. It plays once. The words are real text throughout; without script,
 * or under reduced motion, it is simply there.
 */
export function VeilResolveHeading({ text, as: Tag = "h2", tone = "day", glow, align = "left", className, style }: VeilResolveHeadingProps) {
  const t = toneOf(tone);
  const light = glowHex(glow ?? (tone === "jewel" ? "gold" : "jade"));
  const reduced = useReducedMotion();
  const rootRef = useContext(ScrollRootContext);
  const ref = useRef<HTMLElement | null>(null);
  // "idle" before script, "armed" while waiting out of view, "play" once seen.
  const [phase, setPhase] = useState<"idle" | "armed" | "play">("idle");
  const words = useMemo(() => wordsOf(text), [text]);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let armed = false;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        // 40% of it, or 160px of a tall one: a heading bigger than its frame must still arrive.
        if (e.isIntersecting && (e.intersectionRatio >= 0.4 || (e.intersectionRect?.height ?? 0) >= 160)) {
          setPhase("play");
          io.disconnect();
        } else if (!armed) {
          armed = true;
          setPhase("armed");
        }
      },
      { root: rootRef?.current ?? null, threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, rootRef, text]);

  return (
    <Tag
      ref={(n: HTMLElement | null) => {
        ref.current = n;
      }}
      className={"dg-scope relative isolate m-0" + (className ? " " + className : "")}
      style={{
        fontFamily: SERIF,
        fontWeight: 380,
        fontSize: "clamp(38px, 5.6cqw, 76px)",
        textWrap: "balance",
        lineHeight: 1.04,
        letterSpacing: "-0.012em",
        fontVariationSettings: '"SOFT" 50',
        color: t.ink,
        textAlign: align,
        ...style,
      }}
    >
      <style>{VEIL_CSS}</style>
      {/* The light the words condense out of. */}
      {phase === "play" && (
        <span
          aria-hidden
          className="dg-veil-glow pointer-events-none absolute -inset-x-[8%] -inset-y-[30%] -z-10"
          style={{ animation: `dg-veil-glow ${1100 + words.length * 80}ms ${EASE} both` }}
        >
          <span
            className="absolute inset-0"
            style={{ background: `radial-gradient(50% 60% at ${align === "center" ? "50%" : "30%"} 50%, ${rgba(light, tone === "jewel" ? 0.35 : 0.55)}, ${rgba(light, 0)} 70%)`, filter: "blur(12px)" }}
          />
          <span
            className="absolute inset-0"
            style={{
              backgroundImage: GRAIN_URL,
              mixBlendMode: "overlay",
              opacity: 0.55,
              WebkitMaskImage: `radial-gradient(50% 60% at ${align === "center" ? "50%" : "30%"} 50%, #000, transparent 70%)`,
              maskImage: `radial-gradient(50% 60% at ${align === "center" ? "50%" : "30%"} 50%, #000, transparent 70%)`,
            }}
          />
        </span>
      )}
      {words.map((w, i) => {
        const br = i > 0 && words[i - 1].line !== w.line;
        const node = (
          <span
            className="dg-veil inline-block"
            style={
              phase === "idle"
                ? undefined
                : phase === "armed"
                  ? { opacity: 0, filter: "blur(14px)" }
                  : { animation: `dg-veil 1100ms ${RESOLVE} ${i * 80}ms both` }
            }
          >
            <span style={{ fontStyle: w.italic ? "italic" : undefined, fontWeight: w.italic ? 340 : undefined }}>{w.text}</span>
          </span>
        );
        return (
          <span key={i}>
            {br && <br />}
            {i > 0 && !br && !w.glue ? " " : ""}
            {node}
          </span>
        );
      })}
    </Tag>
  );
}
