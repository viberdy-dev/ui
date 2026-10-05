"use client";

import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import type { CSSProperties, RefObject } from "react";

/**
 * DuskFooter — a footer that sets like the sun.
 *
 * As it scrolls into view, a grained halo sinks from high in the jade room
 * toward a hairline horizon, warming from gold through rose to ember,
 * while the room above takes a faint rose wash; the brand stands on the
 * horizon in a giant italic serif, lit from behind where the sun is.
 * Scroll drives it and nothing loops; under reduced motion the sun rests
 * low.
 *
 * Part of the Diffused Glow kit: a warm bone day (#f6f1e6) and a jade room
 * (#0b120f); soft, grained halos in gold, rose or jade (or any #rrggbb), at
 * most two per view; a serif through var(--font-serif) over Geist. Respects
 * prefers-reduced-motion. No dependencies beyond React. Paste it as its own
 * file: it repeats the kit's small helpers, which would clash in one module.
 * For the serif, load Fraunces with next/font (variable: "--font-serif") on a parent.
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries plugin).
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

const SERIF = 'var(--font-serif, "Fraunces", "Iowan Old Style", "Palatino Linotype", Georgia, serif)';

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

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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

/** The element that scrolls: null for the window, or the site itself in "self" mode. */
const ScrollRootContext = createContext<RefObject<HTMLElement | null> | null>(null);

// Each part carries only the CSS it needs, so any one of them works on its own.
// Nothing is interpolated into these sheets; colours arrive as CSS variables.
// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".dg-scope :focus-visible,.dg-scope:focus-visible{outline:2px solid var(--dg-ring);outline-offset:3px;border-radius:revert-layer}";

/** The focus ring colour for a ground: bronze light on the jade room, jade on the day. */
function ringVar(tone: string): CSSProperties {
  return { "--dg-ring": tone === "jewel" ? BRONZE : JADE_FILL } as CSSProperties;
}

export type DgLink = { label: string; href: string };

/** Blend two #rrggbb colours. */
function mixHex(a: string, b: string, k: number): string {
  const x = rgbOf(a);
  const y = rgbOf(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export type DuskFooterProps = {
  brand: string;
  line?: string;
  columns: { title: string; lines: (string | DgLink)[] }[];
  legal?: string;
  /** The sun's colour at the start of the set, and at dusk. */
  glow?: string;
  dusk?: string;
  className?: string;
};

/**
 * A footer that sets like the sun. As it scrolls into view, a grained halo
 * sinks from high in the jade room toward a hairline horizon, warming from
 * gold through rose to ember, while the room above takes a faint rose wash.
 * On the horizon stands the brand in a giant italic serif, lit from behind
 * where the sun is. Scroll drives it (nothing loops), and under reduced
 * motion the sun simply rests low.
 */
export function DuskFooter({ brand, line, columns, legal, glow = "gold", dusk = "#c9705f", className }: DuskFooterProps) {
  const t = TONES.jewel;
  const reduced = useReducedMotion();
  const rootRef = useContext(ScrollRootContext);
  const ref = useRef<HTMLElement>(null);
  const a = glowHex(glow);
  const b = glowHex(dusk);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scroller: HTMLElement | Window = rootRef?.current ?? window;
    let raf = 0;
    const paint = () => {
      raf = 0;
      let p = 0.72;
      if (!reduced) {
        const r = el.getBoundingClientRect();
        const top = scroller instanceof Window ? 0 : scroller.getBoundingClientRect().top;
        const vh = scroller instanceof Window ? window.innerHeight : scroller.clientHeight;
        // 0 as the footer's top enters, 1 once its bottom is in view.
        p = Math.max(0, Math.min(1, (vh - (r.top - top)) / Math.max(1, Math.min(r.height, vh))));
      }
      const e = p * p * (3 - 2 * p);
      el.style.setProperty("--sy", `${(30 + e * 56).toFixed(2)}%`);
      el.style.setProperty("--ss", (1 + e * 0.18).toFixed(3));
      el.style.setProperty("--sun", e < 0.5 ? mixHex(a, "#f2a39a", e * 2) : mixHex("#f2a39a", b, (e - 0.5) * 2));
      el.style.setProperty("--wash", (e * 0.22).toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    paint();
    // Capture, so a scroll anywhere (the window, the site's own scroller, any container it sits in) moves the sun.
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced, rootRef, a, b]);

  return (
    <footer
      ref={ref}
      className={"dg-scope @container relative isolate w-full overflow-hidden" + (className ? " " + className : "")}
      style={{ ...ringVar("jewel"), "--sy": "30%", "--ss": "1", "--sun": a, "--wash": "0", background: t.ground, color: t.ink, fontFamily: SANS } as CSSProperties}
    >
      <style>{FOCUS_CSS}</style>
      {/* Dusk: a rose wash over the upper room. */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(242,163,154,1), rgba(242,163,154,0) 70%)", opacity: "var(--wash)" }} />
      {/* The sun, grained, setting toward the horizon. */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 h-[120cqw] w-[120cqw] max-h-[1200px] max-w-[1200px]" style={{ top: "var(--sy)", transform: "translate(-50%,-50%) scale(var(--ss))" }}>
        <span className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(closest-side, var(--sun), transparent 62%)", opacity: 0.55 }} />
        <span
          className="absolute inset-0 rounded-full"
          style={{ backgroundImage: GRAIN_URL, mixBlendMode: "overlay", opacity: 0.55, WebkitMaskImage: "radial-gradient(closest-side, #000, transparent 60%)", maskImage: "radial-gradient(closest-side, #000, transparent 60%)" }}
        />
      </div>
      <div className="relative mx-auto max-w-[1240px] px-6 pt-24 @3xl:px-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 @3xl:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="col-span-2 @3xl:col-span-1">
            <p className="m-0 text-[26px] italic" style={{ fontFamily: SERIF, fontWeight: 360 }}>
              {brand}
            </p>
            {line && (
              <p className="mt-3 max-w-[30ch] text-[14.5px] leading-[1.6]" style={{ color: t.ink2 }}>
                {line}
              </p>
            )}
          </div>
          {columns.map((c) => (
            <div key={c.title}>
              <p className="m-0 text-[11px] uppercase tracking-[0.18em]" style={{ fontFamily: MONO, color: t.ink3 }}>
                {c.title}
              </p>
              <ul className="m-0 mt-4 list-none space-y-2 p-0">
                {c.lines.map((l) =>
                  typeof l === "string" ? (
                    <li key={l} className="text-[14.5px]" style={{ color: t.ink2 }}>
                      {l}
                    </li>
                  ) : (
                    <li key={l.label}>
                      <a href={safeHref(l.href)} className="text-[14.5px] transition-colors hover:text-[#f3ede2]" style={{ color: t.ink2 }}>
                        {l.label}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {/* The brand on the horizon, lit from behind where the sun is. */}
      <div aria-hidden className="relative mt-16 select-none">
        <p
          className="m-0 text-center italic leading-[0.82]"
          style={{
            fontFamily: SERIF,
            fontWeight: 340,
            fontSize: "clamp(96px, 24cqw, 360px)",
            letterSpacing: "-0.03em",
            color: "transparent",
            backgroundImage: "radial-gradient(40% 90% at 50% 100%, var(--sun), rgba(243,237,226,0.18) 60%, rgba(243,237,226,0.08))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
          }}
        >
          {brand}
        </p>
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, var(--sun) 50%, transparent)", opacity: 0.6 }} />
      </div>
      {legal && (
        <p className="relative m-0 mx-auto max-w-[1240px] px-6 py-6 text-[12px] @3xl:px-12" style={{ fontFamily: MONO, color: t.ink3 }}>
          {legal}
        </p>
      )}
    </footer>
  );
}
