"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";

/**
 * RuleHandoffFlip — the kit's rule for any list, with reflows that hand the break on.
 *
 * Items become plates on the lattice and every third breaks. Filter, sort
 * or add and every item moves from where it was to where it is in 380ms,
 * all at once; the break is recomputed from the new order and passes on.
 * Items, a key and a render function. For your own markup it also exports
 * bgBreaks (the rule), BgPlate (the module) and useRuleFlip (the reflow).
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

const BG_REFLOW_MS = 380;

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
 * The CSS half of the lattice: `.bg-grid` lays children on the same columns
 * as bgGrid (4 on a phone, 12 from 48rem, the same step as Tailwind's @3xl),
 * and sets --bg-g (the gutter) for the overshoots.
 */
const GRID_CSS =
  ".bg-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));column-gap:8px;padding-inline:24px;--bg-g:8px}" +
  "@container (min-width:48rem){.bg-grid{grid-template-columns:repeat(12,minmax(0,1fr));column-gap:1.875cqw;padding-inline:calc(3.75cqw + 8px);--bg-g:1.875cqw}}";

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

/**
 * Reflows that keep identity. After every change of `key`, each cell marked
 * `data-bg-flip` (with a stable id) moves from where it was to where it is
 * now, all at once, no stagger, in 380ms on the kit's curve (Web Animations,
 * transform only). A reflow that starts mid-flight starts from where the cell
 * is on screen, so a fast run of changes collapses into one clean move. New
 * cells rise 12px into place. A resize re-reads where everything rests, so
 * the next reflow never starts from an old layout. Reduced motion moves them
 * instantly. Use it on your own grid: mark the cells, pass what changed.
 */
export function useRuleFlip(ref: RefObject<HTMLElement | null>, key: string) {
  const reduced = useReducedMotion();
  const prev = useRef(new Map<string, { x: number; y: number }>());
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const rr = root.getBoundingClientRect();
    const k = root.offsetWidth ? rr.width / root.offsetWidth : 1;
    const next = new Map<string, { x: number; y: number }>();
    const first = prev.current.size === 0;
    root.querySelectorAll<HTMLElement>("[data-bg-flip]").forEach((el) => {
      const id = el.dataset.bgFlip ?? "";
      // Where it is on screen now: its last resting place plus whatever a running reflow has moved it.
      let offX = 0;
      let offY = 0;
      const running = el.getAnimations();
      if (running.length) {
        const t = getComputedStyle(el).transform;
        const m = new DOMMatrixReadOnly(t === "none" ? undefined : t);
        offX = m.m41;
        offY = m.m42;
        running.forEach((a) => a.cancel());
      }
      const r = el.getBoundingClientRect();
      const here = { x: (r.left - rr.left) / (k || 1), y: (r.top - rr.top) / (k || 1) };
      next.set(id, here);
      if (reduced || first) return;
      const was = prev.current.get(id);
      if (!was) {
        el.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: BG_REFLOW_MS, easing: BG_EASE });
        return;
      }
      const dx = was.x + offX - here.x;
      const dy = was.y + offY - here.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration: BG_REFLOW_MS, easing: BG_EASE });
    });
    prev.current = next;
  }, [ref, key, reduced]);
  // After a resize (or a font swap that reflows the grid), where things rest has changed: re-read it quietly.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const ro = new ResizeObserver(() => {
      const cells = [...root.querySelectorAll<HTMLElement>("[data-bg-flip]")];
      if (cells.some((el) => el.getAnimations().length)) return;
      const rr = root.getBoundingClientRect();
      const k = root.offsetWidth ? rr.width / root.offsetWidth : 1;
      const next = new Map<string, { x: number; y: number }>();
      cells.forEach((el) => {
        const r = el.getBoundingClientRect();
        next.set(el.dataset.bgFlip ?? "", { x: (r.left - rr.left) / (k || 1), y: (r.top - rr.top) / (k || 1) });
      });
      prev.current = next;
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [ref]);
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

const FLIP_CSS =
  ".bg-flip-run>*{grid-column:span var(--bg-span-phone,2)}" +
  "@container (min-width:48rem){.bg-flip-run>*{grid-column:span var(--bg-span,3)}}";

/**
 * RuleHandoffFlip — the kit's rule for any list, with reflows that hand the
 * break on.
 *
 * Give it items, a key and a render function: it lays them on the lattice
 * (each `span` columns of twelve, `spanPhone` of four) as plates, and every
 * third breaks by the rule, two gutters out at its leading edge with the
 * bracket, while the plate it overlaps keeps a gutter of padding clear.
 * Filter, sort or add, and every item moves from where it was to where it
 * is, all at once, in 380ms on the kit's curve; the break is recomputed from
 * the new order, so it passes to whichever item is now third (the old one
 * lets go in 240ms). Reduced motion moves them instantly. It brings its own
 * @container, so it lays out by its own width. It is a client component:
 * pass `getKey` and `render` from a client component (functions can't cross
 * from a server one). For your own markup, the same parts are exported:
 * bgBreaks (the rule), BgPlate (the module) and useRuleFlip (the reflow).
 */
export function RuleHandoffFlip<T>({
  items,
  getKey,
  render,
  every = 3,
  span = 3,
  spanPhone = 2,
  surface = "field",
  ground = FIELD.paper,
  color = FIELD.ink,
  pad = 16,
  label,
  className = "",
}: {
  items: T[];
  getKey: (item: T) => string;
  render: (item: T, index: number) => ReactNode;
  every?: number;
  /** Columns per item, of twelve. */
  span?: number;
  /** Columns per item on a phone, of four. */
  spanPhone?: number;
  /** The ground the list sits on, which sets the bracket's colour (acid on the field, ink on paper). */
  surface?: "field" | "paper";
  /** The plates' colour and their text colour. */
  ground?: string;
  color?: string;
  pad?: number;
  /** An accessible name for the list. */
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const keys = items.map(getKey).join("|");
  useRuleFlip(ref, keys);
  return (
    <div className={"bg-scope w-full @container " + className} style={bgMark(surface)}>
      <style>{GRID_CSS + FLIP_CSS + FOCUS_CSS}</style>
      <div
        ref={ref}
        role="list"
        aria-label={label}
        className="bg-grid bg-flip-run relative gap-y-6"
        style={{ ["--bg-span" as string]: String(clamp(span, 1, 12)), ["--bg-span-phone" as string]: String(clamp(spanPhone, 1, 4)) } as CSSProperties}
      >
        {items.map((it, i) => (
          <BgPlate
            key={getKey(it)}
            flip={getKey(it)}
            index={i + 1}
            breaks={bgBreaks(i, items.length, every)}
            yields={bgBreaks(i + 1, items.length, every)}
            ground={ground}
            color={color}
            line={color === FIELD.paper ? FIELD.lineOnField : FIELD.lineOnPaper}
            pad={pad}
            itemRole="listitem"
            plateClassName="py-6"
          >
            {render(it, i)}
          </BgPlate>
        ))}
      </div>
    </div>
  );
}
