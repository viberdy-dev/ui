"use client";

import { useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

/**
 * HaloTreatmentCard — a treatment card with a light well.
 *
 * The well holds a grained halo in the treatment's own colour, resting low
 * like a lamp turned down; on hover or focus it rises and blooms, leaning a
 * little toward the pointer (420ms), and the card lifts on a
 * feathered shadow. The name is the card's link, so the whole card is one
 * target, and the focus ring goes round the card.
 *
 * Part of the Diffused Glow kit: a warm bone day (#f6f1e6) and a jade room
 * (#0b120f); soft, grained halos in gold, rose or jade (or any #rrggbb), at
 * most two per view; a serif through var(--font-serif) over Geist. Respects
 * prefers-reduced-motion. No dependencies beyond React. Paste it as its own
 * file: it repeats the kit's small helpers, which would clash in one module.
 * For the serif, load Fraunces with next/font (variable: "--font-serif") on a parent.
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

const SERIF = 'var(--font-serif, "Fraunces", "Iowan Old Style", "Palatino Linotype", Georgia, serif)';

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

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

/** The bronze accent, used only as light. */
const BRONZE = "#c9a15e";

/** The one filled action in the kit: booking. */
const JADE_FILL = "#2f6f57";

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
const FOCUS_CSS = ".dg-scope :focus-visible,.dg-scope:focus-visible{outline:2px solid var(--dg-ring);outline-offset:3px;border-radius:revert-layer}";

/** The focus ring colour for a ground: bronze light on the jade room, jade on the day. */
function ringVar(tone: string): CSSProperties {
  return { "--dg-ring": tone === "jewel" ? BRONZE : JADE_FILL } as CSSProperties;
}

const CARD_CSS =
  ".dg-card{transition:transform 450ms " + EASE + ",box-shadow 450ms " + EASE + "}" +
  ".dg-card:hover,.dg-card:focus-within{transform:translateY(-4px)}" +
  ".dg-card .dg-well-light{transition:transform 420ms " + EASE + ",opacity 420ms " + EASE + "}" +
  ".dg-card:hover .dg-well-light,.dg-card:focus-within .dg-well-light{opacity:1}" +
  // The whole card is the target, so the ring goes round the card, not the name inside it.
  // Only where :has() exists; older engines keep the link's own ring.
  "@supports selector(:has(a)){.dg-card a:focus-visible{outline:none!important}.dg-card:has(a:focus-visible){outline:2px solid var(--dg-ring);outline-offset:3px}}" +
  "@media (prefers-reduced-motion: reduce){.dg-card,.dg-card .dg-well-light{transition:none}.dg-card:hover,.dg-card:focus-within{transform:none}}";

export type DgTreatment = {
  name: string;
  line: string;
  duration: string;
  price: string;
  href: string;
  /** The treatment's own light: gold, rose, jade or #rrggbb. */
  glow?: string;
  /** A short tag in the well, e.g. "Facial" or "Most booked". */
  tag?: string;
};

export type HaloTreatmentCardProps = DgTreatment & {
  tone?: DgTone;
  /** A two-digit index in the well's corner. */
  index?: number;
  className?: string;
};

/**
 * A treatment as a card with a light well. The well holds a soft, grained
 * halo in the treatment's own colour, resting low like a lamp turned down;
 * on hover or focus it rises and blooms (420ms), leaning a little toward the
 * pointer, and the card lifts on a feathered shadow. The
 * name is the card's link, so the whole card is one target.
 */
export function HaloTreatmentCard({ name, line, duration, price, href, glow = "rose", tag, tone = "day", index, className }: HaloTreatmentCardProps) {
  const t = toneOf(tone);
  const light = glowHex(glow);
  const dark = tone === "jewel";
  const lightRef = useRef<HTMLSpanElement>(null);

  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    const el = lightRef.current;
    if (!el) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) * 0.18;
    const dy = (e.clientY - r.top - r.height * 0.35) * 0.12;
    el.style.transform = `translate(${dx.toFixed(1)}px, ${(dy - 18).toFixed(1)}px) scale(1.14)`;
  };
  const onLeave = () => {
    if (lightRef.current) lightRef.current.style.transform = "";
  };

  return (
    <article
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={"dg-scope dg-card group relative flex flex-col overflow-hidden rounded-[26px]" + (className ? " " + className : "")}
      style={{ ...ringVar(tone), background: t.raised, boxShadow: `inset 0 0 0 1px ${t.line}, ${t.shadow}`, fontFamily: SANS, color: t.ink }}
    >
      <style>{FOCUS_CSS + CARD_CSS}</style>
      <div aria-hidden className="relative m-2 aspect-[5/4] overflow-hidden rounded-[20px]" style={{ background: t.panel }}>
        <span ref={lightRef} className="dg-well-light absolute inset-[-20%] opacity-80">
          <span
            className="absolute inset-0"
            style={{ background: `radial-gradient(38% 42% at 50% 72%, ${rgba(light, dark ? 0.9 : 0.95)}, ${rgba(light, dark ? 0.28 : 0.4)} 45%, ${rgba(light, 0)} 72%)` }}
          />
          <span
            className="absolute inset-0"
            style={{
              backgroundImage: GRAIN_URL,
              mixBlendMode: "overlay",
              opacity: 0.7,
              WebkitMaskImage: "radial-gradient(40% 44% at 50% 72%, #000, transparent 75%)",
              maskImage: "radial-gradient(40% 44% at 50% 72%, #000, transparent 75%)",
            }}
          />
        </span>
        {index !== undefined && (
          <span className="absolute left-4 top-3 text-[28px] italic" style={{ fontFamily: SERIF, fontWeight: 340, color: t.ink3 }}>
            {String(index).padStart(2, "0")}
          </span>
        )}
        {tag && (
          <span
            className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10.5px] uppercase tracking-[0.16em]"
            style={{ fontFamily: MONO, color: t.ink2, background: dark ? "rgba(243,237,226,0.06)" : "rgba(251,248,241,0.7)", boxShadow: `inset 0 0 0 1px ${t.line}` }}
          >
            {tag}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
        <h3 className="m-0 text-[26px] leading-[1.1]" style={{ fontFamily: SERIF, fontWeight: 400, fontVariationSettings: '"SOFT" 50' }}>
          <a href={safeHref(href)} className="after:absolute after:inset-0 after:rounded-[26px] after:content-['']">
            {name}
          </a>
        </h3>
        <p className="mt-2 text-[14.5px] leading-[1.55]" style={{ color: t.ink2 }}>
          {line}
        </p>
        <div className="mt-auto flex items-center justify-between pt-5 text-[13px]" style={{ color: t.ink2 }}>
          <span style={{ fontFamily: MONO }}>
            {duration} · {price}
          </span>
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" style={{ color: t.ink }}>
            Book →
          </span>
        </div>
      </div>
    </article>
  );
}
