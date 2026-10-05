"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";

/**
 * EdgeInvertHeadline — a headline that turns over exactly where a plate sits under it, and plates that obey the rule.
 *
 * Each plate under the caps headline carries an aligned copy in the opposite
 * colour, clipped to the plate, so the words invert at the plates' edges to
 * the pixel, with no blend mode. Plates live on lattice cells: drag one (or
 * use the arrow keys) and the inversion follows 1:1, then snaps; on column
 * 3, 6 or 9 a plate breaks by the rule. Field or paper; a p, h1 or h2.
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

/** The mark (bracket, tag, focus ring) for a ground: acid on the field, ink on paper. */
function bgMark(ground: "field" | "paper"): CSSProperties {
  const c = ground === "field" ? FIELD.acid : FIELD.ink;
  return { ["--bg-mark" as string]: c, ["--bg-ring" as string]: c } as CSSProperties;
}

/** Layout changes: 380ms, no stagger, no bounce. Role hand-offs take 240ms. */
const BG_EASE = "cubic-bezier(.2,.8,.2,1)";

const BG_HANDOFF_MS = 240;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
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

/**
 * The lattice at a width: 12 columns from 768px (48rem; gutter 1.875%, 24px at
 * 1280), else 4 (8px gutters). The margin is two gutters and 8px (56px at
 * 1280, 24px on a phone): room for a first-column breaker's overshoot and its
 * bracket. `pitch` is a column plus a gutter; the drawn hairlines run through
 * the gutter centres.
 */
function bgGrid(width: number) {
  const wide = width >= 768;
  const cols = wide ? 12 : 4;
  const gutter = wide ? width * 0.01875 : 8;
  const margin = gutter * 2 + 8;
  const col = (width - margin * 2 - gutter * (cols - 1)) / cols;
  return { cols, gutter, margin, col, pitch: col + gutter };
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

/** Where a plate sits: its first column and row on the lattice (from 1). */
type BgCell = { col: number; row: number };

const BG_INVERT_TONES = {
  field: { ground: FIELD.field, text: FIELD.paper, plate: FIELD.paper, copy: FIELD.ink, hint: FIELD.ink2, line: FIELD.lineOnPaper, tick: "rgba(241,240,232,0.34)" },
  paper: { ground: FIELD.paper, text: FIELD.ink, plate: FIELD.field, copy: FIELD.paper, hint: FIELD.onField2, line: FIELD.lineOnField, tick: "rgba(10,10,31,0.3)" },
} as const;

/**
 * EdgeInvertHeadline — a headline that turns over exactly where a plate
 * sits under it, and plates that obey the rule.
 *
 * The caps headline sits on the lattice, its columns ticked along the top.
 * The plates under it carry an aligned copy of the same headline in the
 * opposite colour, clipped to each plate, so the words invert at the plates'
 * edges to the pixel (no blend mode, no contrast gamble). The plates live on
 * lattice cells: drag one (or focus it and use the arrow keys) and the
 * inversion follows 1:1, then it snaps to the nearest cell in 320ms. The
 * columns are a run, so a plate that starts on column 3, 6 or 9 breaks by
 * the rule: two gutters out at its leading edge with the bracket, and the
 * inverted slice widens with it. The real text is read once; the copies are
 * hidden. Field (paper plates) or paper (blue plates).
 */
export function EdgeInvertHeadline({
  text = "We break the grid by exactly as much as makes it look right.",
  plates = [
    { col: 3, row: 2 },
    { col: 5, row: 4 },
  ],
  as: Tag = "p",
  tone = "field",
  size = "clamp(40px, 8.6cqw, 128px)",
  measure = "14ch",
  hint = "Drag",
  className = "",
  style,
}: {
  text?: string;
  /** Where the plates start: the lattice cell of each one's top-left corner (from 1). */
  plates?: BgCell[];
  /** The headline's element: make it the page's h1 or a section's h2 when it is one. */
  as?: "p" | "h1" | "h2" | "h3";
  tone?: keyof typeof BG_INVERT_TONES;
  size?: string;
  /** The headline's maximum width. */
  measure?: string;
  /** The small label on each plate. */
  hint?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const t = BG_INVERT_TONES[tone] ?? BG_INVERT_TONES.field;
  const hostRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const plateRefs = useRef<(HTMLDivElement | null)[]>([]);
  const copyRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const reduced = useReducedMotion();
  const [box, setBox] = useState({ w: 0, h: 0, hx: 0, hy: 0, hw: 0 });
  // The plates' cells. A default array is a new object every render, so the start is read by value.
  const plateKey = plates.map((p) => `${p.col},${p.row}`).join(";");
  const [cells, setCells] = useState<BgCell[]>(plates);
  const [seen, setSeen] = useState(plateKey);
  if (seen !== plateKey) {
    setSeen(plateKey);
    setCells(plates);
  }
  const [said, setSaid] = useState("");
  const drag = useRef({ i: -1, x0: 0, y0: 0, dx: 0, dy: 0 });

  // Measure the frame and the headline (an empty first measure is skipped).
  useEffect(() => {
    const host = hostRef.current;
    const head = headRef.current;
    if (!host || !head) return;
    const read = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      const next = { w, h, hx: head.offsetLeft, hy: head.offsetTop, hw: head.offsetWidth };
      setBox((b) => (b.w === next.w && b.h === next.h && b.hx === next.hx && b.hy === next.hy && b.hw === next.hw ? b : next));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(host);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);

  const g = bgGrid(box.w || 1280);
  const span = g.cols === 12 ? 4 : 2;
  const pw = g.pitch * span - g.gutter;
  const ph = g.pitch * 2 - g.gutter;
  const maxCol = Math.max(1, g.cols - span + 1);
  const maxRow = Math.max(1, Math.floor((box.h - g.margin - ph) / g.pitch) + 1);
  // Cells stay legal at any width: a narrower frame pulls plates back onto it.
  const fit = (c: BgCell): BgCell => ({ col: clamp(Math.round(c.col), 1, maxCol), row: clamp(Math.round(c.row), 1, maxRow) });
  const breaksAt = (c: BgCell) => bgBreaks(c.col - 1, g.cols);
  // Where a plate draws: its cell, grown two gutters to the left when it breaks.
  const geom = (c: BgCell) => {
    const lead = breaksAt(c) ? g.gutter * 2 : 0;
    return { x: g.margin + (c.col - 1) * g.pitch - lead, y: g.margin + (c.row - 1) * g.pitch, w: pw + lead };
  };
  const nearest = (x: number, y: number): BgCell => fit({ col: (x - g.margin) / g.pitch + 1, row: (y - g.margin) / g.pitch + 1 });
  const placed = cells.map(fit);

  // During a drag the plate and its copy are written directly, every move, so the inversion tracks 1:1.
  const paint = (i: number, x: number, y: number) => {
    const p = plateRefs.current[i];
    const c = copyRefs.current[i];
    if (p) p.style.transform = `translate(${x}px, ${y}px)`;
    if (c) c.style.transform = `translate(${box.hx - x}px, ${box.hy - y}px)`;
  };
  const moveTo = (i: number, from: { x: number; y: number; w: number }, to: BgCell) => {
    const end = geom(to);
    const p = plateRefs.current[i];
    const c = copyRefs.current[i];
    // Write the destination first: React skips a style it thinks is unchanged, and a drag wrote over it.
    paint(i, end.x, end.y);
    if (p) p.style.width = `${end.w}px`;
    setCells((old) => old.map((cl, j) => (j === i ? to : fit(cl))));
    setSaid(`Plate ${i + 1} at column ${to.col}, row ${to.row}${breaksAt(to) ? ": a third column, so it breaks the grid by the rule" : ""}.`);
    if (reduced) return;
    const opts = { duration: 320, easing: BG_EASE };
    p?.animate([{ transform: `translate(${from.x}px, ${from.y}px)`, width: `${from.w}px` }, { transform: `translate(${end.x}px, ${end.y}px)`, width: `${end.w}px` }], opts);
    c?.animate([{ transform: `translate(${box.hx - from.x}px, ${box.hy - from.y}px)` }, { transform: `translate(${box.hx - end.x}px, ${box.hy - end.y}px)` }], opts);
  };
  const onDown = (e: ReactPointerEvent<HTMLDivElement>, i: number) => {
    if (e.button !== 0) return;
    // A grab during a snap starts from the snap's destination, with nothing still animating over it.
    plateRefs.current[i]?.getAnimations().forEach((a) => a.cancel());
    copyRefs.current[i]?.getAnimations().forEach((a) => a.cancel());
    drag.current = { i, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // A synthetic pointer can't be captured; the drag still follows moves.
    }
    e.preventDefault();
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const cl = placed[d.i];
    if (d.i < 0 || !cl) return;
    const r = hostRef.current?.getBoundingClientRect();
    const k = r && hostRef.current?.offsetWidth ? r.width / hostRef.current.offsetWidth : 1;
    d.dx = (e.clientX - d.x0) / (k || 1);
    d.dy = (e.clientY - d.y0) / (k || 1);
    const at = geom(cl);
    paint(d.i, at.x + d.dx, at.y + d.dy);
  };
  const onUp = () => {
    const d = drag.current;
    const cl = placed[d.i];
    if (d.i < 0 || !cl) return;
    const i = d.i;
    d.i = -1;
    const at = geom(cl);
    const from = { x: at.x + d.dx, y: at.y + d.dy, w: at.w };
    const lead = breaksAt(cl) ? g.gutter * 2 : 0;
    moveTo(i, from, nearest(from.x + lead, from.y));
  };
  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>, i: number) => {
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const s = step[e.key];
    const cl = placed[i];
    if (!s || !cl) return;
    e.preventDefault();
    moveTo(i, geom(cl), fit({ col: cl.col + s[0], row: cl.row + s[1] }));
  };

  const type: CSSProperties = { fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 0.86, letterSpacing: "-0.005em", textTransform: "uppercase", maxWidth: measure };
  // The headline and its copies share one box: the lattice's margin on every side but the bottom.
  const frame = "m-0 px-6 pb-8 pt-6 @3xl:px-[calc(3.75cqw_+_8px)] @3xl:pb-[4cqw] @3xl:pt-[calc(3.75cqw_+_8px)]";
  return (
    <div ref={hostRef} className={"bg-scope relative isolate w-full overflow-hidden @container " + className} style={{ background: t.ground, color: t.text, ...bgMark(tone), ...style }}>
      <style>{FOCUS_CSS}</style>
      {/* The lattice's columns, ticked along the top: 6px hairlines through the gutter centres. */}
      {box.w
        ? Array.from({ length: g.cols + 1 }, (_, i) => (
            <span key={i} aria-hidden className="pointer-events-none absolute top-0 block h-1.5 w-px" style={{ left: g.margin + i * g.pitch - g.gutter / 2, background: t.tick }} />
          ))
        : null}
      <Tag ref={headRef as RefObject<HTMLHeadingElement & HTMLParagraphElement>} className={"relative select-none " + frame} style={type}>
        {text}
      </Tag>
      {box.w
        ? placed.map((cl, i) => {
            const at = geom(cl);
            const brk = breaksAt(cl);
            return (
              <div
                key={i}
                ref={(el) => void (plateRefs.current[i] = el)}
                role="button"
                tabIndex={0}
                aria-roledescription="movable plate"
                aria-label={`Plate ${i + 1}, at column ${cl.col}, row ${cl.row}. Arrow keys move it by one cell.`}
                onPointerDown={(e) => onDown(e, i)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onKeyDown={(e) => onKey(e, i)}
                className="absolute left-0 top-0 cursor-grab touch-none select-none active:cursor-grabbing"
                style={{ width: at.w, height: ph, transform: `translate(${at.x}px, ${at.y}px)`, transition: "none", zIndex: brk ? 2 : 1 }}
              >
                <BgBracket on={brk} />
                <div className="absolute inset-0 overflow-hidden" style={{ background: t.plate, boxShadow: `inset 0 0 0 1px ${t.line}` }}>
                  {/* The same headline, in the opposite colour, placed so it lines up with the real one: the plate shows only its slice. */}
                  <p
                    ref={(el) => void (copyRefs.current[i] = el)}
                    aria-hidden
                    className={"pointer-events-none absolute left-0 top-0 " + frame}
                    style={{ ...type, color: t.copy, width: box.hw || undefined, transform: `translate(${box.hx - at.x}px, ${box.hy - at.y}px)`, transition: "none" }}
                  >
                    {text}
                  </p>
                  <span aria-hidden className="absolute bottom-2 right-3 text-[11px] uppercase" style={{ fontFamily: MONO, letterSpacing: "0.08em", color: t.hint }}>
                    {hint}
                  </span>
                </div>
              </div>
            );
          })
        : null}
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
    </div>
  );
}
