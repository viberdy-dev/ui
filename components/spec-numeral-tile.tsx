"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * SpecNumeral / SpecNumeralTile — a big numeral in a spec-sheet voice, whose
 * digits roll into place like an odometer the first time it scrolls into view.
 *
 * Every digit is its own column of 0–9 that rolls to its value in 650ms;
 * the columns start 45ms apart from the right, so the right-most lands first
 * and the most significant digit last, and a six-digit figure has settled
 * inside 900ms. It reads as landing rather than ticking. Separators, the prefix and the unit stay put, and the digits
 * are tabular, so the width never jumps while it counts. The real value is
 * in the text for assistive tech and search; the rolling columns are
 * decoration.
 *
 * The numeral is set in the page's own grotesque, bold, with tabular figures,
 * the way keynote recap slides and live dashboards set their numbers; mono
 * is kept for the small metadata label, never the figure itself (a mono
 * headline number reads as a terminal, not a spec sheet).
 *
 * SpecNumeralTile sets it the bento way: a tile on a near-black canvas with a
 * 1px hairline and no shadow, a mono metadata label, the numeral, its unit in
 * a lighter weight, and an optional delta chip in the one accent colour.
 *
 * Under prefers-reduced-motion the number simply appears. `replayKey` rolls it
 * again when it changes. The label's mono comes from --font-mono (or the
 * site's --font-geist-mono) with a system fallback.
 *
 * Needs Tailwind v4 (or v3.4+). No dependencies beyond React.
 */

const MONO = "var(--font-mono, var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace))";
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** "#rrggbb" if valid, otherwise the fallback. Never interpolated unchecked. */
function safeHex(hex: string | undefined, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex || "") ? (hex as string) : fallback;
}

function format(value: number, decimals: number, group: boolean): string {
  const v = Number.isFinite(value) ? value : 0;
  return v.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: group,
  });
}

export function SpecNumeral({
  value,
  decimals = 0,
  group = true,
  prefix = "",
  unit,
  duration = 650,
  replayKey,
  className = "",
  style,
}: {
  value: number;
  decimals?: number;
  /** Thousands separators. */
  group?: boolean;
  /** Before the digits, e.g. "$" or "+". */
  prefix?: string;
  /** After the digits, in a lighter weight, e.g. "ms", "%", "×". */
  unit?: string;
  /** Roll time of each column, in ms (they start 45ms apart). */
  duration?: number;
  /** Change it to roll the number again. */
  replayKey?: string | number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);
  const [armedKey, setArmedKey] = useState(replayKey);
  // A new replayKey resets to zero; the observer below rolls it again.
  if (armedKey !== replayKey) {
    setArmedKey(replayKey);
    setShown(false);
  }
  const text = format(value, decimals, group);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(() => setShown(true), 0);
      return () => window.clearTimeout(t);
    }
    let t = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[entries.length - 1].isIntersecting) {
          io.disconnect();
          // One frame at zero first, so the columns have somewhere to roll from.
          t = window.setTimeout(() => setShown(true), 40);
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [shown, armedKey]);

  const chars = text.split("");
  const digitCount = chars.filter((c) => c >= "0" && c <= "9").length;
  let seen = 0;

  return (
    <span
      ref={ref}
      className={"inline-flex items-baseline leading-none " + className}
      style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.045em", ...style }}
    >
      <span className="sr-only">{prefix + text + (unit ? " " + unit : "")}</span>
      <span aria-hidden className="inline-flex items-baseline">
        {prefix && <span>{prefix}</span>}
        {chars.map((c, i) => {
          if (c < "0" || c > "9") return <span key={"p" + (chars.length - 1 - i)}>{c}</span>;
          const d = Number(c);
          // The right-most digit starts first; the most significant lands last.
          const order = seen++;
          const delay = (digitCount - 1 - order) * 45;
          return (
            // Keyed by place value from the right, so a column keeps its
            // identity when the number grows or shrinks by a digit.
            <span key={"p" + (chars.length - 1 - i)} className="relative inline-block overflow-hidden" style={{ height: "1em", lineHeight: 1 }}>
              <span className="invisible">0</span>
              <span
                className="absolute left-0 top-0 flex flex-col motion-reduce:!transition-none"
                style={{
                  transform: "translateY(" + (shown ? -d : 0) + "em)",
                  transition: shown ? "transform " + duration + "ms " + EASE + " " + delay + "ms" : "none",
                }}
              >
                {"0123456789".split("").map((n) => (
                  <span key={n} style={{ height: "1em", lineHeight: 1 }}>
                    {n}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
        {unit && (
          <span className="ml-[0.12em] font-normal" style={{ fontSize: "0.42em", letterSpacing: "0", opacity: 0.6 }}>
            {unit}
          </span>
        )}
      </span>
    </span>
  );
}

export function SpecNumeralTile({
  label,
  value,
  decimals,
  prefix,
  unit,
  caption,
  delta,
  accent = "#ff5a1f",
  size = "md",
  replayKey,
  className = "",
}: {
  /** Mono metadata label, e.g. "Latency · p95". */
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  unit?: string;
  caption?: ReactNode;
  /** A short change note in the accent, e.g. "−38% vs 2025". */
  delta?: string;
  /** The one accent colour, "#rrggbb". */
  accent?: string;
  /** "md" for a 1x1 tile, "lg" for the 2x2 hero tile. */
  size?: "md" | "lg";
  replayKey?: string | number;
  className?: string;
}) {
  const a = safeHex(accent, "#ff5a1f");
  const lg = size === "lg";
  return (
    <div
      className={"@container relative flex h-full flex-col justify-between overflow-hidden rounded-[20px] text-white " + (lg ? "p-6 " : "p-4 ") + className}
      style={{ background: "#0f1012", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase leading-[16px] tracking-[0.12em]" style={{ fontFamily: MONO, color: "rgba(255,255,255,0.5)" }}>
          {label}
        </p>
        {delta && (
          <span
            className="shrink-0 rounded-full px-2 text-[11px] font-medium leading-[18px]"
            style={{ fontFamily: MONO, color: a, background: a + "1f", boxShadow: "inset 0 0 0 1px " + a + "40" }}
          >
            {delta}
          </span>
        )}
      </div>
      <div>
        <SpecNumeral
          value={value}
          decimals={decimals}
          prefix={prefix}
          unit={unit}
          replayKey={replayKey}
          className="font-bold"
          // Sized to the tile (container units), so any value fits.
          style={{ fontSize: lg ? "clamp(48px, 24cqw, 112px)" : "clamp(28px, 22cqw, 44px)" }}
        />
        {caption && (
          <p className="mt-3 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}
