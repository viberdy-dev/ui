"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

/**
 * WeightSlamText — neo-brutalist display type whose weight slams instead of
 * easing. Each letter jumps from its rest weight to heavy in two hard steps
 * (400, 650, 900) inside 80ms, like a press coming down, and lets go in three
 * slower steps. There is no interpolation to watch, only the hits.
 *
 * Three modes:
 * - "sweep" (the default): pointing at the text, or focusing a link or
 *   button inside it, slams the letters left to right 45ms apart, a row of
 *   stamps coming down; leaving releases them right to left.
 * - "press": the letter under the pointer is struck to the peak and its
 *   neighbours part-way, in the same hard steps. Which letter is "under" the
 *   pointer is judged against the letters' rest positions (an invisible copy
 *   set at the rest weight), so the line can reflow as letters thicken
 *   without the strike jittering back and forth. On a touch screen, where
 *   nothing hovers, it plays the sweep once instead, when it scrolls into view.
 * - "view": slams left to right once, when most of it is on screen, and stays.
 *
 * Screen readers get the words once, from a visually hidden copy; the
 * letters are aria-hidden. Under prefers-reduced-motion the steps are dropped
 * and the weight simply changes. A variable font gives the in-between step
 * (the stack starts with var(--font-display), then Archivo); a static font
 * still slams between its own cuts.
 *
 * Needs Tailwind v4 (or v3.4+). No dependencies beyond React.
 */

const DISPLAY = 'var(--font-display, "Archivo", "Archivo Black", "Arial Black", "Helvetica Neue", Arial, sans-serif)';
const HEX = /^#[0-9a-fA-F]{6}$/;
const TAGS = ["h1", "h2", "h3", "p"] as const;
const NBSP = String.fromCharCode(160);

export type WeightSlamTextProps = {
  /** The text; "\n" starts a new line. */
  text?: string;
  as?: "h1" | "h2" | "h3" | "p";
  mode?: "sweep" | "press" | "view";
  /** Rest weight, 100 to 700. */
  rest?: number;
  /** Peak weight, 500 to 1000. */
  peak?: number;
  /** How many neighbours on each side a press thickens, 0 to 3. */
  reach?: number;
  /** Letters also widen as they slam (needs a width axis, like Archivo's). */
  stretch?: boolean;
  caps?: boolean;
  /** Text colour, #rrggbb. */
  color?: string;
  className?: string;
};

function clampNum(v: number, lo: number, hi: number, fallback: number) {
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
}

export function WeightSlamText({
  text = "Build loud.\nShip daily.",
  as = "h2",
  mode = "sweep",
  rest = 400,
  peak = 900,
  reach = 1,
  stretch = true,
  caps = true,
  color = "#000000",
  className = "",
}: WeightSlamTextProps) {
  const Tag = (TAGS as readonly string[]).includes(as) ? as : "h2";
  const lo = clampNum(rest, 100, 700, 400);
  const hi = Math.max(lo, clampNum(peak, 500, 1000, 900));
  const span = Math.round(clampNum(reach, 0, 3, 1));
  const ink = HEX.test(color) ? color : "#000000";
  const lines = (text || " ").split("\n").map((l) => [...l]);
  const count = lines.reduce((n, l) => n + l.length, 0);
  // Where each line's letters start in the flat index.
  const starts = lines.map((_, li) => lines.slice(0, li).reduce((n, l) => n + l.length, 0));

  const face = useRef<HTMLSpanElement>(null);
  const ghost = useRef<HTMLSpanElement>(null);
  const [struck, setStruck] = useState(-1);
  const [on, setOn] = useState(false);
  const [auto, setAuto] = useState(false);
  // A new text clears a strike measured against the old one.
  const [seenText, setSeenText] = useState(text);
  if (seenText !== text) {
    setSeenText(text);
    setStruck(-1);
  }

  // "view" mode, and "press" on screens that cannot hover: slam once when most of it is on screen.
  useEffect(() => {
    const el = face.current;
    if (!el || (mode !== "view" && mode !== "press")) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (!e || e.intersectionRatio < 0.6) return;
        if (mode === "press" && !window.matchMedia("(hover: none)").matches) return;
        setAuto(true);
        io.disconnect();
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (mode !== "press" || e.pointerType === "touch") return;
    const g = ghost.current;
    if (!g) return;
    const r = g.getBoundingClientRect();
    // Previews can be transform-scaled: map screen pixels to layout pixels.
    const k = r.width / (g.offsetWidth || r.width) || 1;
    const x = (e.clientX - r.left) / k;
    const y = (e.clientY - r.top) / k;
    let best = -1;
    let bestD = Infinity;
    g.querySelectorAll<HTMLElement>("[data-i]").forEach((s) => {
      const cx = s.offsetLeft + s.offsetWidth / 2;
      const cy = s.offsetTop + s.offsetHeight / 2;
      // Rows count double, so the strike stays on the line the pointer is on.
      const d = Math.abs(cx - x) + Math.abs(cy - y) * 2;
      if (d < bestD) {
        bestD = d;
        best = Number(s.dataset.i);
      }
    });
    if (best !== struck) setStruck(best);
  };

  const sweeping = (mode === "sweep" && on) || auto;
  const weightOf = (i: number) => {
    if (sweeping) return hi;
    if (mode !== "press" || struck < 0) return lo;
    const d = Math.abs(i - struck);
    if (d === 0) return hi;
    if (d <= span) return Math.round(lo + ((hi - lo) * (span + 1 - d)) / (span + 2));
    return lo;
  };

  const letters = (ghostLayer: boolean) =>
    lines.map((line, li) => (
      <span key={li} className="block whitespace-nowrap">
        {line.map((ch, ci) => {
          const i = starts[li] + ci;
          const w = ghostLayer ? lo : weightOf(i);
          const up = w > lo;
          const delay = mode === "press" ? 0 : up ? i * 45 : (count - 1 - i) * 30;
          const timing = up ? "80ms steps(2, end) " + delay + "ms" : "180ms steps(3, end) " + delay + "ms";
          return (
            <span
              key={ci}
              data-i={i}
              className="inline-block motion-reduce:!transition-none"
              style={{
                fontWeight: w,
                fontStretch: stretch && up ? Math.round(100 + ((w - lo) / Math.max(1, hi - lo)) * 12) + "%" : "100%",
                transition: ghostLayer ? "none" : "font-weight " + timing + ", font-stretch " + timing,
              }}
            >
              {ch === " " ? NBSP : ch}
            </span>
          );
        })}
      </span>
    ));

  return (
    <Tag
      className={"relative select-none leading-[0.9] tracking-[-0.02em] " + (caps ? "uppercase " : "") + className}
      style={{ fontFamily: DISPLAY, color: ink } as CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={() => {
        setStruck(-1);
        setOn(false);
      }}
      onPointerEnter={(e) => {
        if (mode === "sweep" && e.pointerType !== "touch") setOn(true);
      }}
      onFocusCapture={() => {
        if (mode === "sweep") setOn(true);
      }}
      onBlurCapture={() => {
        if (mode === "sweep") setOn(false);
      }}
    >
      <span className="sr-only">{text.replace(/\n/g, " ")}</span>
      <span ref={face} aria-hidden className="block">
        {letters(false)}
      </span>
      {/* The rest-weight copy the press measures against; never painted. */}
      <span ref={ghost} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 block w-full">
        {letters(true)}
      </span>
    </Tag>
  );
}
