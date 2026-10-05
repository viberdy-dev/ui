"use client";

import { useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * ZSwapPlateCard — a work card on the lattice that swaps layers with the neighbour it overlaps.
 *
 * In a run (direct children of a grid with the class bg-swap-run and a
 * column gap of --bg-g), every third card breaks by the rule, two gutters
 * out at its leading edge with the bracket, and the card it overlaps keeps
 * a gutter clear. Hover or focus that card and the two swap layers, the
 * bracket going with the lift, in 240ms. Your image, or a construction
 * plate drawn in code from a seed.
 *
 * Part of the Broken Grid kit: a Klein-blue field #2416f0, paper plates
 * #f1f0e8, ink #0a0a1f, and acid #e2ff3a only where a rule fires. One rule,
 * "The Third": every third module in a run overshoots its leading edge by two
 * gutters (overlapping its neighbour by one) and wears the acid bracket; the
 * ends never break. Radius 0, no shadows; reflows in 380ms, no bounce. Big
 * Shoulders through var(--font-big-shoulders) for display over Geist.
 * Respects prefers-reduced-motion. No dependencies beyond React. Paste it as
 * its own file: it repeats the kit's small helpers, which would clash in one
 * module. Load Big Shoulders with next/font (variable:
 * "--font-big-shoulders") on a parent, or from Google Fonts or @fontsource.
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries plugin).
 */

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

const DISPLAY = 'var(--font-big-shoulders, "Big Shoulders", "Big Shoulders Display", "Arial Narrow", "Roboto Condensed", sans-serif)';

/**
 * A Klein-blue field, paper plates, blue-black ink, and acid for a rule firing.
 * Secondary and tertiary text clear 4.5:1 on their grounds (ink2 7.4, ink3 5.0
 * on paper; onField2 5.9, onField3 4.8 on the field); `edgeOnPaper` is the 3:1
 * boundary for inputs.
 */
const FIELD = {
  field: "#2416f0",
  raised: "#3a2ff5",
  pressed: "#1a0ec4",
  paper: "#f1f0e8",
  ink: "#0a0a1f",
  ink2: "rgba(10,10,31,0.72)",
  ink3: "rgba(10,10,31,0.6)",
  onField2: "rgba(241,240,232,0.86)",
  onField3: "rgba(241,240,232,0.76)",
  lineOnField: "rgba(241,240,232,0.22)",
  lineOnPaper: "rgba(10,10,31,0.14)",
  edgeOnPaper: "rgba(10,10,31,0.5)",
  edgeOnField: "rgba(241,240,232,0.6)",
  acid: "#e2ff3a",
} as const;

/** Layout changes: 380ms, no stagger, no bounce. Role hand-offs take 240ms. */
const BG_EASE = "cubic-bezier(.2,.8,.2,1)";

const BG_HANDOFF_MS = 240;

/** Links: strip tabs and newlines, refuse backslashes, allow http(s), mailto, tel and same-site paths. */
function safeHref(raw: string): string {
  const v = raw.replace(/[\t\n\r]/g, "").trim();
  if (!v || v.includes("\\")) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#?]/.test(v) && !/^\/\//.test(v)) return v;
  return "#";
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

/**
 * The rule, "The Third": in a run of `count` modules, module `index` (from 0)
 * breaks when it is every `every`th (3, 6, 9...) and is neither end of the run.
 * Use it for your own runs, so the break is computed and never placed by hand.
 */
export function bgBreaks(index: number, count: number, every = 3): boolean {
  if (every < 2 || index <= 0 || index >= count - 1) return false;
  return (index + 1) % every === 0;
}

// Each part carries only the CSS it needs, so any one of them works on its own.
// revert-layer keeps an element's own corners when a host page's focus rule rounds or flattens them.
const FOCUS_CSS = ".bg-scope :focus-visible,.bg-scope:focus-visible{outline:2px solid var(--bg-ring,#e2ff3a)!important;outline-offset:3px;border-radius:revert-layer}";

/**
 * The bracket a module wears when the rule breaks it: an L of 2px, one gutter
 * long, 6px outside its leading corner, so it reads against the ground. Its
 * colour is --bg-mark (acid on the field, ink on paper; see bgMark).
 */
function BgBracket({ on, size = 24, className = "" }: { on: boolean; size?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <span
      aria-hidden
      className={"pointer-events-none absolute left-0 top-0 block " + className}
      style={{
        width: size,
        height: size,
        borderTop: `2px solid var(--bg-mark, ${FIELD.acid})`,
        borderLeft: `2px solid var(--bg-mark, ${FIELD.acid})`,
        transform: "translate(-6px, -6px)",
        opacity: on ? 1 : 0,
        transition: reduced ? "none" : `opacity ${BG_HANDOFF_MS}ms ${BG_EASE}`,
      }}
    />
  );
}

/** A small deterministic generator, so a seed always draws the same plate on the server and in the browser. */
function bgRandom(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

/**
 * A construction plate: two or three primitives (a quarter circle, a bar, a
 * cross, a dot field) snapped to a 4 x 4 sub-lattice, drawn in code from a
 * seed. It stands in for work imagery and never looks like stock.
 */
function BgConstruction({ seed, ink = FIELD.ink, ground = FIELD.paper, accent, className = "" }: { seed: number; ink?: string; ground?: string; accent?: string; className?: string }) {
  const r = bgRandom(seed);
  const cell = 25;
  const shapes: ReactNode[] = [];
  const pick = (n: number) => Math.floor(r() * n);
  const count = 2 + pick(2);
  for (let i = 0; i < count; i++) {
    const kind = pick(4);
    const cx = pick(3) * cell;
    const cy = pick(3) * cell;
    const fill = i === 0 && accent ? accent : ink;
    if (kind === 0) {
      const q = pick(4);
      const x = cx + (q === 1 || q === 2 ? 2 * cell : 0);
      const y = cy + (q >= 2 ? 2 * cell : 0);
      const sx = q === 1 || q === 2 ? -1 : 1;
      const sy = q >= 2 ? -1 : 1;
      shapes.push(<path key={i} d={`M${x} ${y} L${x + sx * 2 * cell} ${y} A${2 * cell} ${2 * cell} 0 0 ${sx * sy > 0 ? 1 : 0} ${x} ${y + sy * 2 * cell} Z`} fill={fill} />);
    } else if (kind === 1) {
      const across = r() > 0.5;
      shapes.push(<rect key={i} x={across ? 0 : cx} y={across ? cy + cell * 0.5 : 0} width={across ? 100 : cell} height={across ? cell : 100} fill={fill} />);
    } else if (kind === 2) {
      shapes.push(
        <g key={i} fill={fill}>
          <rect x={cx + cell * 0.8} y={cy} width={cell * 0.4} height={cell * 2} />
          <rect x={cx} y={cy + cell * 0.8} width={cell * 2} height={cell * 0.4} />
        </g>,
      );
    } else {
      const dots: ReactNode[] = [];
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) dots.push(<circle key={a * 4 + b} cx={cx + 6 + a * 12.5} cy={cy + 6 + b * 12.5} r={2.6} />);
      shapes.push(
        <g key={i} fill={fill}>
          {dots}
        </g>,
      );
    }
  }
  return (
    <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={"block h-full w-full " + className} style={{ background: ground }}>
      {shapes}
    </svg>
  );
}

/**
 * One module of a run: a cell (what reflows move) holding a plate the rule
 * may break. Broken, the plate grows two gutters out at its leading edge (one
 * closes the gap, one overlaps the neighbour) while its padding grows by the
 * same, so its content never moves and never reaches the overlap; it rides
 * one layer up, wears the bracket and gets a firmer leading edge, so the
 * overlap reads as two plates, not one slab. The module before a breaker
 * `yields`: its trailing padding grows by a gutter, so nothing it holds sits
 * under the overlap. The hand-off (breaking, or letting go) takes 240ms.
 * Depth is the overlap and a 1px hairline, no shadow. Put runs in a `.bg-grid`
 * (or any grid whose column gap is --bg-g).
 */
export function BgPlate({
  flip,
  index,
  breaks,
  yields = false,
  ground = FIELD.paper,
  color = FIELD.ink,
  line = FIELD.lineOnPaper,
  edge,
  pad = 24,
  lift = 0,
  itemRole,
  className = "",
  plateClassName = "",
  style,
  plateStyle,
  children,
}: {
  /** A stable id, for reflows. */
  flip?: string;
  /** The module's number in its run, from 1 (shown by the inspector). */
  index: number;
  breaks: boolean;
  /** The next module breaks: keep a gutter of trailing padding clear of its overlap. */
  yields?: boolean;
  ground?: string;
  color?: string;
  line?: string;
  /** The breaker's leading edge; defaults to half-strength text colour. */
  edge?: string;
  /** Inner padding in px; the overshoot is added to it at the leading edge. */
  pad?: number;
  /** Extra layers up. */
  lift?: number;
  /** A role for the cell, such as listitem inside a list. */
  itemRole?: string;
  className?: string;
  plateClassName?: string;
  style?: CSSProperties;
  plateStyle?: CSSProperties;
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const hand = `${BG_HANDOFF_MS}ms ${BG_EASE}`;
  const rim = edge ?? (color === FIELD.paper ? FIELD.edgeOnField : FIELD.edgeOnPaper);
  return (
    <div data-bg-flip={flip} role={itemRole} className={"relative " + className} style={{ zIndex: (breaks ? 2 : 1) + lift, ...style }}>
      <div
        data-bg-module=""
        data-bg-index={index}
        data-bg-break={breaks ? "true" : "false"}
        data-bg-yield={yields ? "true" : undefined}
        className={"relative h-full " + plateClassName}
        style={{
          background: ground,
          color,
          boxShadow: breaks ? `inset 1px 0 0 ${rim}, inset 0 0 0 1px ${line}` : `inset 0 0 0 1px ${line}`,
          marginInlineStart: breaks ? "calc(var(--bg-g, 24px) * -2)" : "0px",
          paddingInlineStart: breaks ? `calc(${pad}px + var(--bg-g, 24px) * 2)` : `${pad}px`,
          paddingInlineEnd: yields ? `calc(${pad}px + var(--bg-g, 24px))` : `${pad}px`,
          transition: reduced ? "none" : `margin-inline-start ${hand}, padding-inline-start ${hand}, padding-inline-end ${hand}, background-color ${hand}, box-shadow ${hand}`,
          ...plateStyle,
        }}
      >
        <BgBracket on={breaks} className="bg-own" />
        {children}
      </div>
    </div>
  );
}

export type BgWork = { title: string; client: string; year: string; tags: string[]; seed: number; href: string; image?: ReactNode };

// Only the card just before a breaker (the one it overlaps) trades places with it: hovering or focusing
// that card lifts it above the breaker, and the bracket goes with the lift. Scoped to .bg-swap-run, so
// other runs on the page are left alone.
const BG_SWAP = ".bg-swap-run>[data-bg-flip]:has(+[data-bg-flip]>[data-bg-break=true])";

const CARD_CSS =
  `${BG_SWAP}:is(:hover,:focus-within){z-index:6!important}` +
  `${BG_SWAP}:is(:hover,:focus-within)+[data-bg-flip]>[data-bg-break=true]>.bg-own{opacity:0!important}` +
  `${BG_SWAP}:is(:hover,:focus-within) .bg-lift{opacity:1!important}`;

/**
 * ZSwapPlateCard — a work card on the lattice that swaps layers with the
 * neighbour it overlaps.
 *
 * In a run, every third card breaks by the rule: two gutters out at its
 * leading edge, one layer up, the bracket on its corner. The card it overlaps
 * keeps a gutter of padding clear of the overlap; hover or focus that card
 * and the two swap layers, the neighbour rising above the breaker and the
 * bracket going with it, in 240ms, then everything returns. The picture is
 * your `image` (an <img> or next/image, filling a 4:3 frame), or a
 * construction plate drawn in code from `seed`. A real link on the title.
 *
 * Put the cards, as direct children, in a grid with the class `bg-swap-run`
 * whose column gap is --bg-g (the kit's `.bg-grid` sets both; otherwise set
 * --bg-g to your gap), inside an @container.
 */
export function ZSwapPlateCard({
  work,
  index,
  count,
  every = 3,
  className = "",
}: {
  work: BgWork;
  /** The card's place in its run, from 0. */
  index: number;
  count: number;
  every?: number;
  className?: string;
}) {
  const breaks = bgBreaks(index, count, every);
  return (
    <BgPlate
      flip={work.title}
      index={index + 1}
      breaks={breaks}
      yields={bgBreaks(index + 1, count, every)}
      pad={16}
      className={"bg-scope h-full " + className}
      style={{ ["--bg-ring" as string]: FIELD.ink } as CSSProperties}
      plateClassName="flex flex-col gap-4 pb-5 pt-4"
    >
      <style>{CARD_CSS + FOCUS_CSS}</style>
      {/* The bracket this card wears only while it is lifted above a breaker. The ring inside the paper plate is ink; the brackets outside it take the section's mark. */}
      <span aria-hidden className="bg-lift pointer-events-none absolute left-0 top-0 block h-6 w-6" style={{ borderTop: `2px solid var(--bg-mark, ${FIELD.acid})`, borderLeft: `2px solid var(--bg-mark, ${FIELD.acid})`, transform: "translate(-6px, -6px)", opacity: 0, transition: `opacity ${BG_HANDOFF_MS}ms ${BG_EASE}` }} />
      <div className="flex items-center justify-between text-[11px] uppercase" style={{ fontFamily: MONO, letterSpacing: "0.08em", color: FIELD.ink3 }}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span>{work.year}</span>
      </div>
      <div className="aspect-[4/3] w-full overflow-hidden [&>img]:h-full [&>img]:w-full [&>img]:object-cover" style={{ boxShadow: `inset 0 0 0 1px ${FIELD.lineOnPaper}` }}>
        {work.image ?? <BgConstruction seed={work.seed} accent={index % 2 ? FIELD.field : undefined} />}
      </div>
      <div className="flex flex-col gap-1">
        <a href={safeHref(work.href)} className="text-[clamp(26px,2.9cqw,40px)] leading-[0.9] no-underline" style={{ fontFamily: DISPLAY, fontWeight: 800, textTransform: "uppercase", color: FIELD.ink }}>
          {work.title}
        </a>
        <p className="m-0 text-[14px]" style={{ color: FIELD.ink2 }}>
          {work.client}
        </p>
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[11px] uppercase" style={{ fontFamily: MONO, letterSpacing: "0.08em", color: FIELD.ink3 }}>
        {work.tags.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </BgPlate>
  );
}
