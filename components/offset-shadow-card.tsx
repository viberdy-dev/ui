"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * OffsetShadowCard — a neo-brutalist card on a hard, unblurred shadow.
 *
 * The card behaves like the kit's button: pointing at it lifts it 2px toward
 * you while the shadow grows from 5px to 7px (the shadow's far corner stays
 * put), and pressing it lands it on the shadow. 100ms linear, nothing eased.
 * Given href, the whole card is one link (the title's link is stretched over
 * the card), so there is one tab stop and one accessible name.
 *
 * The picture well takes a photograph, or draws a flat geometric motif in the
 * card's colour when there is none. Every line in the card, the motif's
 * included, is the same 3px ink.
 *
 * Type reads var(--font-display) for the title and var(--font-mono) for
 * labels, so a buyer's own next/font variables drop in.
 *
 * Needs Tailwind v4 (or v3.4+). No dependencies beyond React.
 */

const DISPLAY = 'var(--font-display, "Archivo", "Archivo Black", "Arial Black", "Helvetica Neue", Arial, sans-serif)';
const SANS = 'var(--font-sans, "Geist", "Inter", "Helvetica Neue", Arial, sans-serif)';
const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

const FILLS = {
  yellow: "#ffd23f",
  coral: "#ff6b6b",
  blue: "#74b9ff",
  lime: "#b4f462",
  pink: "#ff5fa2",
  white: "#ffffff",
  cream: "#fffdf5",
} as const;

export type OffsetShadowColor = keyof typeof FILLS;

/**
 * The kit's shadow ladder. A lift moves the card up-left 2px and grows the
 * shadow 2px, so the shadow's far corner stays put; a press lands the card on
 * the shadow. Written out whole so Tailwind can see every class.
 */
const DEPTH = {
  sm: {
    rest: "shadow-[3px_3px_0_0_var(--osc-ink)] ",
    hover: "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[5px_5px_0_0_var(--osc-ink)] ",
    down: "translate-x-[3px] translate-y-[3px] shadow-none ",
  },
  md: {
    rest: "shadow-[5px_5px_0_0_var(--osc-ink)] ",
    hover: "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[7px_7px_0_0_var(--osc-ink)] ",
    down: "translate-x-[5px] translate-y-[5px] shadow-none ",
  },
  lg: {
    rest: "shadow-[8px_8px_0_0_var(--osc-ink)] ",
    hover: "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[10px_10px_0_0_var(--osc-ink)] ",
    down: "translate-x-[8px] translate-y-[8px] shadow-none ",
  },
} as const;

const HEX = /^#[0-9a-fA-F]{6}$/;
const LEVELS = ["h2", "h3", "h4"] as const;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** Links: strip tabs and newlines, refuse backslashes, allow http(s), mailto, tel and same-site paths. */
function safeHref(raw: string) {
  const v = raw.replace(/[\t\n\r]/g, "").trim();
  if (!v || v.includes("\\")) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#?]/.test(v) && !/^\/\//.test(v)) return v;
  return "#";
}

/** Images: the same guard, and only http(s) or same-site paths. */
function safeSrc(raw: string) {
  let v = "";
  for (const ch of raw) if (ch.charCodeAt(0) > 31 && ch.charCodeAt(0) !== 127) v += ch;
  v = v.trim();
  if (!v || v.includes("\\")) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^\/(?!\/)/.test(v) || /^\.{1,2}\//.test(v)) return v;
  return "";
}

export type OffsetShadowCardProps = {
  title: string;
  /** A mono label above the title. */
  eyebrow?: string;
  body?: ReactNode;
  tags?: string[];
  /** A hole-punched price tag pinned to the picture. */
  price?: string;
  /** A rotated sticker over the top-right corner, e.g. "New". */
  badge?: string;
  /** Mono text at the left of the footer row. */
  meta?: string;
  /** The footer's action label (shown when linked). */
  action?: string;
  /** Makes the whole card one link. */
  href?: string;
  image?: { src: string; alt: string };
  /** The flat motif drawn when there is no image. */
  motif?: "orbit" | "stack" | "bars";
  /** The picture well's fill: a kit fill or any #rrggbb. */
  color?: OffsetShadowColor | string;
  /** Border, shadow and text colour. */
  ink?: string;
  /** The card's own ground. */
  surface?: "white" | "cream";
  /** Shadow depth on the kit's ladder: 3px, 5px or 8px. Give a featured card "lg". */
  depth?: "sm" | "md" | "lg";
  as?: "h2" | "h3" | "h4";
  className?: string;
};

function Motif({ kind, ink }: { kind: "orbit" | "stack" | "bars"; ink: string }) {
  const s = { stroke: ink, strokeWidth: 3, vectorEffect: "non-scaling-stroke" as const };
  if (kind === "stack") {
    return (
      <svg aria-hidden viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={"translate(" + (78 + i * 34) + " " + (40 + i * 26) + ")"}>
            <rect x="8" y="8" width="118" height="78" fill={ink} />
            <rect x="0" y="0" width="118" height="78" fill={i === 2 ? "#ffffff" : i === 1 ? "#fffdf5" : ink} {...s} />
            {i === 2 && <path d="M16 24H78M16 40H96M16 56H60" {...s} />}
          </g>
        ))}
      </svg>
    );
  }
  if (kind === "bars") {
    const hs = [46, 82, 64, 118, 96, 140];
    return (
      <svg aria-hidden viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        {hs.map((h, i) => (
          <g key={i}>
            <rect x={58 + i * 36 + 5} y={172 - h + 5} width="24" height={h} fill={ink} />
            <rect x={58 + i * 36} y={172 - h} width="24" height={h} fill={i === 3 ? ink : "#ffffff"} {...s} />
          </g>
        ))}
        <path d="M34 172H290" {...s} />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
      <circle cx="214" cy="96" r="64" fill={ink} />
      <rect x="84" y="62" width="96" height="96" fill="#ffffff" {...s} />
      <circle cx="132" cy="110" r="22" fill="none" {...s} />
      <path d="M40 176H280" {...s} />
    </svg>
  );
}

export function OffsetShadowCard({
  title,
  eyebrow,
  body,
  tags = [],
  price,
  badge,
  meta,
  action = "Open",
  href,
  image,
  motif = "orbit",
  color = "yellow",
  ink = "#000000",
  surface = "white",
  depth = "md",
  as = "h3",
  className = "",
}: OffsetShadowCardProps) {
  const [pressed, setPressed] = useState(false);
  const line = HEX.test(ink) ? ink : "#000000";
  const fill = own(FILLS, color) ? FILLS[color] : HEX.test(color) ? color : FILLS.yellow;
  const ground = surface === "cream" ? "#fffdf5" : "#ffffff";
  const Heading = (LEVELS as readonly string[]).includes(as) ? as : "h3";
  const src = image ? safeSrc(image.src) : "";
  const link = href ? safeHref(href) : null;
  const rule = "3px solid " + line;
  const release = () => setPressed(false);
  const d = own(DEPTH, depth) ? DEPTH[depth] : DEPTH.md;

  const cls =
    "group relative flex flex-col text-left transition-[transform,translate,box-shadow] duration-100 ease-linear motion-reduce:transition-none " +
    "has-[a:focus-visible]:[outline:3px_dashed_var(--osc-ink)] has-[a:focus-visible]:[outline-offset:6px] " +
    (link ? (pressed ? d.down : d.rest + d.hover) : d.rest) +
    className;

  return (
    <article
      className={cls}
      style={{ "--osc-ink": line, border: rule, background: ground, color: line } as CSSProperties}
      onPointerDown={(e) => {
        if (link && e.button === 0) setPressed(true);
      }}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onKeyDown={(e) => {
        if (link && e.key === "Enter" && !e.repeat) setPressed(true);
      }}
      onKeyUp={release}
      onBlur={release}
    >
      <div className="relative aspect-[16/10] overflow-hidden" style={{ background: fill, borderBottom: rule }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={image?.alt ?? ""} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
        ) : (
          <Motif kind={motif} ink={line} />
        )}
        {price && (
          <span
            className="absolute bottom-4 left-4 inline-flex h-9 items-center gap-2.5 pl-2.5 pr-3.5 text-[15px] tabular-nums"
            style={{ background: "#ffffff", border: rule, color: line, fontFamily: DISPLAY, fontWeight: 800 }}
          >
            <span aria-hidden className="size-[11px] rounded-full" style={{ border: rule, background: fill }} />
            {price}
          </span>
        )}
      </div>

      {badge && (
        <span
          className="pointer-events-none absolute -right-3 -top-3 z-10 inline-flex h-8 rotate-[6deg] items-center px-3 text-[12px] uppercase tracking-[0.08em]"
          style={{ background: line, color: ground, fontFamily: MONO, fontWeight: 700 }}
        >
          {badge}
        </span>
      )}

      <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
        {eyebrow && (
          <p className="text-[12px] uppercase tracking-[0.1em]" style={{ fontFamily: MONO, opacity: 0.7 }}>
            {eyebrow}
          </p>
        )}
        <Heading className="text-[26px] leading-[1.02] tracking-[-0.02em]" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
          {link ? (
            <a href={link} className="outline-none focus-visible:![outline:none] after:absolute after:inset-0 after:content-['']">
              {title}
            </a>
          ) : (
            title
          )}
        </Heading>
        {body && (
          <div className="line-clamp-3 text-[15.5px] leading-[1.5]" style={{ fontFamily: SANS, opacity: 0.8 }}>
            {body}
          </div>
        )}
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {tags.map((t) => (
              <li
                key={t}
                className="inline-flex h-7 items-center px-2 text-[11.5px] uppercase tracking-[0.06em]"
                style={{ border: rule, fontFamily: MONO, fontWeight: 600 }}
              >
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>

      {(meta || link) && (
        <div className="flex h-12 items-center justify-between gap-4 px-5" style={{ borderTop: rule }}>
          <span className="truncate text-[12px] uppercase tracking-[0.08em]" style={{ fontFamily: MONO, opacity: 0.7 }}>
            {meta}
          </span>
          {link && (
            <span aria-hidden className="inline-flex shrink-0 items-center gap-2 text-[15px]" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
              {action}
              <svg
                width="18"
                height="14"
                viewBox="0 0 18 14"
                fill="none"
                className="transition-transform duration-100 ease-linear group-hover:translate-x-[3px] motion-reduce:transition-none"
              >
                <path d="M0 7H15M9 1.5L15 7L9 12.5" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
              </svg>
            </span>
          )}
        </div>
      )}
    </article>
  );
}
