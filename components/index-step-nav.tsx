"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * IndexStepNav — a numbered nav whose third item hangs below the bar, and a tag that steps.
 *
 * The items are a run: by the rule the third hangs one gutter below the bar
 * on a contrasting plate with the bracket, and the bar's hairline dips to
 * pass under it. A tag steps to the current item (or the one you point at)
 * in four ticks over 320ms, never a glide. An email item copies the address
 * and says so. Field (acid marks) or paper (ink marks).
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

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

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

export type BgLink = { label: string; href: string };

/**
 * IndexStepNav — a numbered nav whose third item hangs below the bar, and an
 * active tag that steps rather than glides.
 *
 * Every item carries its number. The items are a run, so by the rule the
 * third (and sixth, and so on, never the last) hangs one gutter below the bar
 * on a contrasting plate with the bracket, and the bar's hairline dips to
 * pass under it and comes back up. The current item is marked by a small tag
 * that steps to it in four ticks over 320ms, like a counter turning, never a
 * glide; point at (or focus) another item and the tag steps over to it, and
 * back when you leave. From 48rem an email item copies the address and says
 * so. Arrow keys, Home and End move between items; the current one is marked
 * for screen readers. Field blue (acid marks) or paper (ink marks). Pass
 * active={-1} while no section is current.
 */
export function IndexStepNav({
  brand = "Overshoot",
  brandHref = "#",
  items = [
    { label: "Work", href: "#work" },
    { label: "Studio", href: "#studio" },
    { label: "The rule", href: "#rule" },
    { label: "Journal", href: "#journal" },
  ],
  defaultActive = 0,
  active: activeProp,
  onChange,
  email = "",
  tone = "field",
  every = 3,
  className = "",
  style,
}: {
  brand?: string;
  brandHref?: string;
  items?: BgLink[];
  defaultActive?: number;
  /** Controlled: which item is current, or -1 for none. */
  active?: number;
  onChange?: (index: number) => void;
  /** An address to copy; empty for none. */
  email?: string;
  tone?: "field" | "paper";
  every?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const [own, setOwn] = useState(defaultActive);
  const active = clamp(activeProp ?? own, -1, items.length - 1);
  const [point, setPoint] = useState(-1);
  const barRef = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);
  // Each item's left, right and top in the bar (a hanging item's top includes its hang); the bar's size.
  const [geo, setGeo] = useState<{ w: number; h: number; at: [number, number, number][] }>({ w: 0, h: 64, at: [] });
  const [copied, setCopied] = useState<"" | "ok" | "no">("");
  const reduced = useReducedMotion();
  const onField = tone === "field";
  const ink = onField ? FIELD.paper : FIELD.ink;
  const dim = onField ? FIELD.onField3 : FIELD.ink3;
  const line = onField ? "rgba(241,240,232,0.34)" : "rgba(10,10,31,0.22)";
  // The hanging plate contrasts with the bar: paper on the field, field blue on paper.
  const plate = onField ? { bg: FIELD.paper, fg: FIELD.ink, num: FIELD.ink3 } : { bg: FIELD.field, fg: FIELD.paper, num: FIELD.onField3 };
  const hangs = items.map((_, i) => bgBreaks(i, items.length, every));
  const hangKey = hangs.map((b) => (b ? 1 : 0)).join("");

  // Measure every item (the tag goes to whichever is current or pointed at; the hairline dips under each hanging one).
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let alive = true;
    const measure = () => {
      const br = bar.getBoundingClientRect();
      const k = bar.offsetWidth ? br.width / bar.offsetWidth : 1;
      const at = refs.current.slice(0, items.length).map((el): [number, number, number] => {
        if (!el) return [0, 0, 0];
        const r = el.getBoundingClientRect();
        return [(r.left - br.left) / k, (r.right - br.left) / k, (r.top - br.top) / k];
      });
      setGeo((g) => (g.w === bar.clientWidth && g.h === bar.clientHeight && JSON.stringify(g.at) === JSON.stringify(at) ? g : { w: bar.clientWidth, h: bar.clientHeight, at }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    refs.current.forEach((el) => el && ro.observe(el));
    // A web font arriving changes the items' widths without changing the bar's.
    document.fonts?.ready.then(() => alive && measure());
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [items.length, hangKey]);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(""), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);

  const choose = (i: number) => {
    if (activeProp === undefined) setOwn(i);
    onChange?.(i);
  };
  const onKey = (e: ReactKeyboardEvent<HTMLAnchorElement>, i: number) => {
    const n = items.length;
    const next = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    refs.current[next]?.focus();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied("ok");
    } catch {
      setCopied("no");
    }
  };
  // The hairline: straight, dipping 8px under each hanging item (which covers it) and back.
  const { w, h } = geo;
  let d = `M0 ${h - 0.5}`;
  geo.at.forEach(([l, r], i) => {
    if (!hangs[i]) return;
    d += ` L${l - 24} ${h - 0.5} C${l - 12} ${h - 0.5} ${l - 12} ${h + 7.5} ${l} ${h + 7.5} L${r} ${h + 7.5} C${r + 12} ${h + 7.5} ${r + 12} ${h - 0.5} ${r + 24} ${h - 0.5}`;
  });
  d += ` L${w} ${h - 0.5}`;
  // The tag: on the item pointed at, else the current one; hidden when neither.
  const shown = point >= 0 ? point : active;
  const spot = shown >= 0 ? geo.at[shown] : undefined;
  const tagY = spot ? spot[2] + 4 : 0;

  return (
    <nav aria-label="Main" className={"bg-scope relative w-full @container " + className} style={{ background: onField ? FIELD.field : FIELD.paper, color: ink, fontFamily: SANS, ...bgMark(tone), ...style }}>
      <style>{FOCUS_CSS + GRID_CSS}</style>
      <div ref={barRef} className="bg-grid relative min-h-16 items-center gap-y-1 py-2 @3xl:py-0">
        <a href={safeHref(brandHref)} className="col-span-2 text-[22px] leading-none no-underline @3xl:col-span-3" style={{ fontFamily: DISPLAY, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.01em", color: ink }}>
          {brand}
        </a>
        <div className="relative order-last col-span-full flex min-h-12 flex-wrap items-center gap-x-5 gap-y-1 @3xl:order-none @3xl:col-span-6 @3xl:h-16 @3xl:flex-nowrap @3xl:gap-7" onPointerLeave={() => setPoint(-1)}>
          {items.map((it, i) => {
            const hang = hangs[i];
            return (
              <a
                key={it.label}
                ref={(el) => void (refs.current[i] = el)}
                href={safeHref(it.href)}
                aria-current={i === active ? (it.href.startsWith("#") ? "location" : "page") : undefined}
                onClick={() => choose(i)}
                onKeyDown={(e) => onKey(e, i)}
                onPointerEnter={() => setPoint(i)}
                onFocus={() => setPoint(i)}
                onBlur={() => setPoint(-1)}
                className="relative flex shrink-0 items-baseline gap-1.5 whitespace-nowrap no-underline"
                style={{ color: hang ? plate.fg : ink, padding: hang ? "10px 12px" : "10px 0", transform: hang ? "translateY(var(--bg-g, 24px))" : undefined, background: hang ? plate.bg : "transparent", zIndex: hang ? 2 : 1 }}
              >
                {hang ? <BgBracket on size={14} /> : null}
                <span className="text-[11px]" style={{ fontFamily: MONO, letterSpacing: "0.08em", color: hang ? plate.num : dim }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[19px] leading-none" style={{ fontFamily: DISPLAY, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  {it.label}
                </span>
              </a>
            );
          })}
        </div>
        {email ? (
          <div className="col-span-full hidden justify-end @3xl:col-span-3 @3xl:flex">
            <button type="button" onClick={copy} className="text-[11px] uppercase" style={{ fontFamily: MONO, letterSpacing: "0.08em", color: copied === "ok" ? (onField ? FIELD.ink : FIELD.paper) : ink, background: copied === "ok" ? (onField ? FIELD.acid : FIELD.ink) : "transparent", padding: "6px 8px", boxShadow: `inset 0 0 0 1px ${copied === "ok" ? "transparent" : line}` }}>
              {copied === "ok" ? "Copied" : copied === "no" ? "Copy failed" : email}
            </button>
          </div>
        ) : null}
        {/* The tag: a 10px square in the mark colour that steps to the item in four ticks (no transition until first measured). */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 block h-2.5 w-2.5"
          style={{
            background: `var(--bg-mark, ${FIELD.acid})`,
            opacity: spot ? 1 : 0,
            transform: `translate(${Math.round((spot?.[0] ?? 0) - 16)}px, ${Math.round(tagY + 8)}px)`,
            transition: reduced || !geo.w ? "none" : `transform 320ms steps(4, end), opacity ${BG_HANDOFF_MS}ms`,
          }}
        />
        <svg aria-hidden className="pointer-events-none absolute left-0 top-0 overflow-visible" width={w || 1} height={h + 12}>
          <path d={d} fill="none" stroke={line} strokeWidth={1} />
        </svg>
        <p aria-live="polite" className="sr-only">
          {copied === "ok" ? `Copied ${email}` : copied === "no" ? "Couldn't copy the address" : ""}
        </p>
      </div>
    </nav>
  );
}
