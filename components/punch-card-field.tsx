"use client";

import { useId, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * PunchCardField — a neo-brutalist background of 80-column punch cards whose
 * holes spell real text.
 *
 * Each card encodes one line in Hollerith code, the way an IBM keypunch
 * would: twelve rows (12, 11, 0 to 9), a letter as a zone punch plus a digit
 * punch, digits as one punch, a few symbols as three. The typed line is
 * printed along the card's top edge, one character over each column, and the
 * unpunched positions carry their printed digits. Cards are cream with a
 * clipped corner, a 3px ink border and a 5px hard shadow, laid across the
 * ground at a tilt.
 *
 * On arrival the holes are punched column by column, 8ms apart, like the
 * punch head crossing the card; after that nothing moves on its own. Point at
 * a column (or tap it) and the decoder frames it and reads it back: the
 * character and its punches, e.g. "R · 11-9".
 *
 * Children render on top, above the field; the layer they sit in lets the
 * pointer through, and each direct child takes it back (add pointer-events-none
 * to a child that should let the decoder through). The field itself is
 * decoration and hidden from assistive technology.
 *
 * Needs Tailwind v4 (or v3.4+). No dependencies beyond React.
 */

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';
const HEX = /^#[0-9a-fA-F]{6}$/;

const FILLS = {
  yellow: "#ffd23f",
  coral: "#ff6b6b",
  blue: "#74b9ff",
  lime: "#b4f462",
  pink: "#ff5fa2",
} as const;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** Row indices top to bottom: 12, 11, 0, 1 … 9. */
const ROW_NAMES = ["12", "11", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const row = (name: string) => ROW_NAMES.indexOf(name);

/** Symbols in the IBM 029 code: the punched rows for each. */
const SYMBOLS: Record<string, string[]> = {
  "&": ["12"],
  "-": ["11"],
  "/": ["0", "1"],
  ".": ["12", "3", "8"],
  ",": ["0", "3", "8"],
  ":": ["2", "8"],
  "'": ["5", "8"],
  "#": ["3", "8"],
  "@": ["4", "8"],
  "?": ["0", "7", "8"],
  "!": ["11", "2", "8"],
  "(": ["12", "5", "8"],
  ")": ["11", "5", "8"],
  "+": ["12", "6", "8"],
  "=": ["6", "8"],
  "*": ["11", "4", "8"],
  "$": ["11", "3", "8"],
  "%": ["0", "4", "8"],
};

/** The punched rows for one character, or [] for a space or anything unknown. */
function punches(ch: string): string[] {
  const c = ch.toUpperCase();
  if (c >= "0" && c <= "9") return [c];
  if (c >= "A" && c <= "I") return ["12", String(c.charCodeAt(0) - 64)];
  if (c >= "J" && c <= "R") return ["11", String(c.charCodeAt(0) - 73)];
  if (c >= "S" && c <= "Z") return ["0", String(c.charCodeAt(0) - 81)];
  return Object.prototype.hasOwnProperty.call(SYMBOLS, c) ? SYMBOLS[c] : [];
}

// Card geometry in SVG units: 80 columns 10 apart, 12 rows 28 apart.
const COLS = 80;
const PITCH_X = 10;
const PITCH_Y = 28;
const LEFT = 30;
const TOP = 46;
const W = LEFT * 2 + COLS * PITCH_X;
const H = TOP + 12 * PITCH_Y + 18;
const HOLE_W = 5.5;
const HOLE_H = 15;
const CUT = 26;

export type PunchCardFieldProps = {
  /** One line per card, up to 80 characters; they repeat to fill the field. */
  lines?: string[];
  /** How many cards to lay out. */
  count?: number;
  /** Card width in px. */
  cardWidth?: number;
  /** Tilt of the whole field in degrees, -8 to 8. */
  tilt?: number;
  /** Punch the holes in on arrival. */
  punchIn?: boolean;
  /** Frame and read back the column under the pointer. */
  decoder?: boolean;
  /** The ground behind the cards: a kit fill, "ink", "cream" or #rrggbb. */
  ground?: keyof typeof FILLS | "ink" | "cream" | string;
  ink?: string;
  children?: ReactNode;
  className?: string;
};

/**
 * PLACEHOLDER lines for "Hod", the kit's fictional branch-preview tool. The
 * build figures in them are invented: pass your own lines before shipping.
 */
const DEFAULT_LINES = [
  "HOD BRANCH PREVIEWS",
  "SHIP THE ROUGH DRAFT TODAY.",
  "EVERY PUSH GETS A LINK - SHARE IT BEFORE YOU MERGE",
  "PREVIEW #482 BUILD OK 38S CHECKS 12/12",
  "COMMENTS PINNED TO THE ELEMENT",
  "ROLL BACK IN ONE KEY: R",
];

function Card({ text, n, ink, uid, punchIn, decoder, active, onCol }: {
  text: string;
  n: number;
  ink: string;
  uid: string;
  punchIn: boolean;
  decoder: boolean;
  active: number;
  onCol: (col: number) => void;
}) {
  const chars = [...text.toUpperCase()].slice(0, COLS);
  const holes: { x: number; y: number; col: number }[] = [];
  chars.forEach((ch, col) => {
    punches(ch).forEach((r) => holes.push({ x: LEFT + col * PITCH_X + (PITCH_X - HOLE_W) / 2, y: TOP + row(r) * PITCH_Y + (PITCH_Y - HOLE_H) / 2, col }));
  });
  const shape = "M" + CUT + " 0H" + W + "V" + H + "H0V" + CUT + "Z";
  const pick = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!decoder) return;
    const svg = e.currentTarget;
    const m = svg.getScreenCTM();
    if (!m) return;
    // Screen to card units, through the field's tilt and any preview scaling.
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const col = Math.floor((p.x - LEFT) / PITCH_X);
    onCol(col >= 0 && col < COLS && p.y > 0 && p.y < H ? col : -1);
  };
  const ch = active >= 0 ? chars[active] ?? " " : "";
  const read = active >= 0 ? (ch === " " ? "SPACE" : ch) + " · " + (punches(ch).join("-") || "no punch") : "";
  return (
    <svg
      viewBox={"-6 -6 " + (W + 14) + " " + (H + 14)}
      className="block h-auto w-full overflow-visible"
      onPointerMove={pick}
      onPointerDown={pick}
      onPointerLeave={() => onCol(-1)}
    >
      <path d={shape} fill={ink} transform="translate(5 5)" />
      <path d={shape} fill="#fffdf5" stroke={ink} strokeWidth="3" strokeLinejoin="miter" />
      {/* Printed digits in rows 0 to 9 of every column, as one pattern. */}
      <rect x={LEFT} y={TOP + 2 * PITCH_Y} width={COLS * PITCH_X} height={10 * PITCH_Y} fill={"url(#" + uid + "-digits)"} />
      {/* The interpreted line along the top edge, one character over each column. */}
      <text
        x={chars.map((_, i) => LEFT + i * PITCH_X + PITCH_X / 2).join(" ")}
        y={TOP - 14}
        fontSize="9"
        textAnchor="middle"
        fill={ink}
        style={{ fontFamily: MONO, fontWeight: 700 }}
      >
        {chars.map((c) => (c === " " ? String.fromCharCode(160) : c)).join("")}
      </text>
      <text x={W - 14} y={H - 6} fontSize="8" textAnchor="end" fill={ink} opacity="0.6" style={{ fontFamily: MONO }}>
        {"CARD " + String(n + 1).padStart(3, "0")}
      </text>
      {holes.map((h, i) => (
        <rect
          key={i}
          className={punchIn ? "pcf-hole" : undefined}
          x={h.x}
          y={h.y}
          width={HOLE_W}
          height={HOLE_H}
          fill={ink}
          style={punchIn ? ({ "--pcf-at": n * 90 + h.col * 8 + "ms" } as CSSProperties) : undefined}
        />
      ))}
      {decoder && active >= 0 && (
        <g pointerEvents="none">
          <rect x={LEFT + active * PITCH_X - 2} y={TOP - 3} width={PITCH_X + 4} height={12 * PITCH_Y + 6} fill="none" stroke={ink} strokeWidth="3" />
          <g transform={"translate(" + Math.min(W - 118, Math.max(0, LEFT + active * PITCH_X - 50)) + " " + (TOP - 40) + ")"}>
            <rect width="118" height="22" fill={ink} />
            <text x="59" y="15" fontSize="11" textAnchor="middle" fill="#fffdf5" style={{ fontFamily: MONO, fontWeight: 700 }}>
              {"COL " + (active + 1) + " · " + read}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

export function PunchCardField({
  lines = DEFAULT_LINES,
  count = 9,
  cardWidth = 560,
  tilt = -5,
  punchIn = true,
  decoder = true,
  ground = "yellow",
  ink = "#000000",
  children,
  className = "",
}: PunchCardFieldProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [hot, setHot] = useState<{ card: number; col: number }>({ card: -1, col: -1 });
  const line = HEX.test(ink) ? ink : "#000000";
  const bg = ground === "ink" ? line : ground === "cream" ? "#fffdf5" : own(FILLS, ground) ? FILLS[ground] : HEX.test(ground) ? ground : FILLS.yellow;
  const list = lines.length ? lines : DEFAULT_LINES;
  const n = Math.max(1, Math.min(24, Math.round(Number.isFinite(count) ? count : 9)));
  const width = Math.max(320, Math.min(900, Number.isFinite(cardWidth) ? cardWidth : 560));
  const angle = Math.max(-8, Math.min(8, Number.isFinite(tilt) ? tilt : -5));

  return (
    <div className={"relative isolate overflow-hidden " + className} style={{ background: bg }}>
      <style>
        {"@keyframes pcf-punch{from{visibility:hidden}to{visibility:visible}}" +
          "@media (prefers-reduced-motion: no-preference){.pcf-hole{animation:pcf-punch 1ms steps(1,end) var(--pcf-at,0ms) backwards}}"}
      </style>
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          <pattern id={uid + "-digits"} width={PITCH_X} height={10 * PITCH_Y} patternUnits="userSpaceOnUse" x={LEFT} y={TOP + 2 * PITCH_Y}>
            {Array.from({ length: 10 }, (_, d) => (
              <text key={d} x={PITCH_X / 2} y={d * PITCH_Y + PITCH_Y / 2 + 3} fontSize="7.5" textAnchor="middle" fill={line} opacity="0.42" style={{ fontFamily: MONO }}>
                {d}
              </text>
            ))}
          </pattern>
        </defs>
      </svg>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div
          className="pointer-events-auto grid shrink-0 gap-x-10 gap-y-9"
          style={{
            width: "max(170%, " + width * 3.4 + "px)",
            gridTemplateColumns: "repeat(auto-fill, minmax(" + width + "px, 1fr))",
            transform: "rotate(" + angle + "deg)",
          }}
        >
          {Array.from({ length: n }, (_, i) => (
            <Card
              key={i}
              n={i}
              text={list[i % list.length]}
              ink={line}
              uid={uid}
              punchIn={punchIn}
              decoder={decoder}
              active={hot.card === i ? hot.col : -1}
              onCol={(col) =>
                setHot((prev) =>
                  col < 0 ? (prev.card === i ? { card: -1, col: -1 } : prev) : prev.card === i && prev.col === col ? prev : { card: i, col },
                )
              }
            />
          ))}
        </div>
      </div>
      {/* The layer itself lets the pointer through to the cards; its direct children take it back. */}
      {children && <div className="pointer-events-none relative [:where(&)>*]:pointer-events-auto">{children}</div>}
    </div>
  );
}
