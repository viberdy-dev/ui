"use client";

import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * SoftGlowButton — a pill with a light inside it.
 *
 * A soft, grained glow follows the pointer across the pill with a slow
 * settle (registered custom properties, so moving costs no renders) and a
 * diffused bloom rises behind it on hover or focus. A press sinks it
 * slightly and the light exhales: a soft ring spreads from the press and
 * fades. Solid is jade on the day ground and lit glass in the jade room;
 * quiet is a hairline pill whose light wakes under the pointer. Renders a
 * link when given an href, else a button.
 *
 * Part of the Diffused Glow kit: a warm bone day (#f6f1e6) and a jade room
 * (#0b120f); soft, grained halos in gold, rose or jade (or any #rrggbb), at
 * most two per view; a serif through var(--font-serif) over Geist. Respects
 * prefers-reduced-motion. No dependencies beyond React. Paste it as its own
 * file: it repeats the kit's small helpers, which would clash in one module.
 * For the serif, load Fraunces with next/font (variable: "--font-serif") on a parent.
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

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

// Registered, so the inner light glides in CSS (a soft 600ms settle) without a render per pointer move.
const GLOW_BTN_CSS =
  "@property --dg-gx{syntax:'<percentage>';inherits:true;initial-value:30%}" +
  "@property --dg-gy{syntax:'<percentage>';inherits:true;initial-value:30%}" +
  ".dg-glow{transition:--dg-gx 600ms " + EASE + ",--dg-gy 600ms " + EASE + ",transform 420ms " + EASE + ",background-color 300ms ease}" +
  ".dg-glow:active{transform:scale(0.97)}" +
  ".dg-glow .dg-bloom{opacity:0;transform:scale(0.85);transition:opacity 450ms " + EASE + ",transform 450ms " + EASE + "}" +
  ".dg-glow:hover .dg-bloom,.dg-glow:focus-visible .dg-bloom{opacity:1;transform:scale(1)}" +
  "@keyframes dg-exhale{from{transform:translate(-50%,-50%) scale(0.3);opacity:0.9}to{transform:translate(-50%,-50%) scale(1.6);opacity:0}}" +
  "@media (prefers-reduced-motion: reduce){.dg-glow,.dg-glow .dg-bloom{transition:none}.dg-glow:active{transform:none}.dg-exhale{display:none}}";

export type SoftGlowButtonProps = {
  children: ReactNode;
  /** Renders a link when set, else a button. */
  href?: string;
  onClick?: () => void;
  /** The ground it sits on: "jewel" (the dark jade room) or "day" (warm bone). */
  tone?: DgTone;
  /** "solid": the one booking action. "quiet": a hairline pill for the second action. */
  variant?: "solid" | "quiet";
  /** The light's colour: gold, rose, jade or a #rrggbb. */
  glow?: string;
  size?: "md" | "lg";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
};

/**
 * A pill with a light inside it. A soft, grained glow follows the pointer
 * across the pill with a slow settle (eased in CSS through registered custom
 * properties, so moving costs no renders), and a diffused bloom rises behind
 * it on hover or focus. A press sinks the pill slightly and the light exhales:
 * a soft ring spreads from where you pressed and fades. Solid is jade on the
 * day ground and lit glass in the jade room; quiet is a hairline pill whose
 * light only wakes under the pointer.
 */
export function SoftGlowButton({
  children,
  href,
  onClick,
  tone = "day",
  variant = "solid",
  glow,
  size = "md",
  type = "button",
  disabled,
  className,
}: SoftGlowButtonProps) {
  const t = toneOf(tone);
  const light = glowHex(glow ?? (tone === "jewel" ? "gold" : "jade"));
  const [exhales, setExhales] = useState<{ id: number; x: number; y: number }[]>([]);
  const nextId = useRef(0);
  const solid = variant === "solid";
  const dark = tone === "jewel";

  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--dg-gx", `${(((e.clientX - r.left) / (r.width || 1)) * 100).toFixed(1)}%`);
    e.currentTarget.style.setProperty("--dg-gy", `${(((e.clientY - r.top) / (r.height || 1)) * 100).toFixed(1)}%`);
  };
  const onDown = (e: ReactPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const id = ++nextId.current;
    setExhales((all) => [...all.slice(-2), { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
  };

  const h = size === "lg" ? 54 : 46;
  const fill = solid ? (dark ? "rgba(243,237,226,0.08)" : JADE_FILL) : "transparent";
  const style: CSSProperties = {
    ...ringVar(tone),
    height: h,
    padding: size === "lg" ? "0 30px" : "0 22px",
    fontFamily: SANS,
    fontSize: size === "lg" ? 16 : 15,
    fontWeight: 500,
    color: solid && !dark ? "#f6f1e6" : t.ink,
    backgroundColor: fill,
    boxShadow: solid
      ? dark
        ? `inset 0 0 0 1px ${t.line2}, inset 0 1px 0 rgba(243,237,226,0.12)`
        : "inset 0 1px 0 rgba(255,255,255,0.18), 0 18px 40px -18px rgba(47,111,87,0.6)"
      : `inset 0 0 0 1px ${t.line2}`,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
  const inner = (
    <>
      {/* The bloom behind the pill. */}
      <span
        aria-hidden
        className="dg-bloom pointer-events-none absolute -inset-x-[30%] -inset-y-[90%] -z-10 rounded-full"
        style={{ background: `radial-gradient(closest-side, ${rgba(light, dark ? 0.32 : 0.45)}, ${rgba(light, 0)})`, filter: "blur(6px)" }}
      />
      {/* The light inside it, grained, following the pointer. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <span
          className="absolute inset-0"
          style={{
            background: `radial-gradient(60% 120% at var(--dg-gx) var(--dg-gy), ${rgba(light, solid ? (dark ? 0.42 : 0.5) : 0.3)}, ${rgba(light, 0)} 70%)`,
            opacity: solid ? 1 : 0.9,
          }}
        />
        <span
          className="absolute inset-0"
          style={{
            backgroundImage: GRAIN_URL,
            mixBlendMode: "overlay",
            opacity: 0.5,
            WebkitMaskImage: "radial-gradient(60% 120% at var(--dg-gx) var(--dg-gy), #000, transparent 70%)",
            maskImage: "radial-gradient(60% 120% at var(--dg-gx) var(--dg-gy), #000, transparent 70%)",
          }}
        />
        {exhales.map((x) => (
          <span
            key={x.id}
            className="dg-exhale absolute rounded-full"
            onAnimationEnd={() => setExhales((all) => all.filter((y) => y.id !== x.id))}
            style={{
              left: x.x,
              top: x.y,
              width: h * 3,
              height: h * 3,
              background: `radial-gradient(closest-side, ${rgba(light, 0.55)}, ${rgba(light, 0)})`,
              animation: `dg-exhale 900ms ${EASE} forwards`,
            }}
          />
        ))}
      </span>
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </>
  );
  const cls =
    "dg-scope dg-glow relative isolate inline-flex select-none items-center justify-center whitespace-nowrap rounded-full" +
    (className ? " " + className : "");
  return (
    <>
      <style>{GLOW_BTN_CSS + FOCUS_CSS}</style>
      {href && !disabled ? (
        <a href={safeHref(href)} onClick={onClick} onPointerMove={onMove} onPointerDown={onDown} className={cls} style={style}>
          {inner}
        </a>
      ) : (
        <button type={type} onClick={onClick} onPointerMove={onMove} onPointerDown={disabled ? undefined : onDown} disabled={disabled} className={cls} style={style}>
          {inner}
        </button>
      )}
    </>
  );
}
