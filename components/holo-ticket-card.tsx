"use client";

import { useRef, useSyncExternalStore } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

/**
 * HoloTicketCard — a tour date as a ticket with a holographic stub.
 *
 * Notched and perforated where the stub tears, the date set in heavy
 * chrome numerals on a strip of foil. Under the pointer the ticket tilts
 * toward you, the foil's colour slides along its thin-film series, fine
 * diffraction lines shimmer and a glare follows the pointer; keyboard
 * focus tilts it too. Sold-out dates dim and lose their link. Dates are
 * ISO strings, printed in UTC so server and browser agree.
 *
 * Part of the Liquid Chrome kit: a graphite room, a four-band chrome ramp
 * (#08090b, #4b4f58, #c9ced6, #ffffff) multiplied by a finish (chrome, gold,
 * rose, cobalt or any #rrggbb), foil colour only as a thin film. Fonts come
 * from CSS variables with Archivo and Geist fallbacks. Respects
 * prefers-reduced-motion. No dependencies beyond React. Paste it as its own
 * file: it repeats the kit's small helpers, which would clash in one module.
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

const DISPLAY = 'var(--font-display, "Archivo", "Helvetica Neue", Arial, sans-serif)';

const PANEL = "#141519";

const RAISED = "#1b1c21";

const INK = "rgba(244,245,247,0.94)";

const INK_2 = "rgba(244,245,247,0.62)";

const INK_3 = "rgba(244,245,247,0.4)";

const LINE_2 = "rgba(255,255,255,0.16)";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** The reflected room, darkest to hottest. Every chrome surface in the kit reflects these four bands. */
const RAMP = ["#08090b", "#4b4f58", "#c9ced6", "#ffffff"] as const;

/** Thin-film colour (Newton's series): silver, champagne, magenta, cyan, green, gold, violet, silver. Unevenly spaced on purpose. */
const FOIL: [string, number][] = [
  ["#d8dce2", 0],
  ["#eadfc4", 0.12],
  ["#d68fc7", 0.3],
  ["#8fd6d1", 0.47],
  ["#a8d68f", 0.6],
  ["#d6b98f", 0.72],
  ["#b48fd6", 0.86],
  ["#d8dce2", 1],
];

/** Metal finishes: the colour the room is multiplied by. */
export const LC_FINISHES = {
  chrome: "#ffffff",
  gold: "#f2cf92",
  rose: "#f1bcb4",
  cobalt: "#b9cbff",
} as const;

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A ramp colour multiplied by the finish, as rgb(). */
function tinted(hex: string, tint: string): string {
  const a = rgbOf(hex);
  const b = rgbOf(tint);
  return `rgb(${Math.round((a[0] * b[0]) / 255)} ${Math.round((a[1] * b[1]) / 255)} ${Math.round((a[2] * b[2]) / 255)})`;
}

/** The finished ramp as the CSS variables every chrome gradient and the focus ring read. */
function finishVars(tint: string): CSSProperties {
  return {
    "--lc-0": tinted(RAMP[0], tint),
    "--lc-1": tinted(RAMP[1], tint),
    "--lc-2": tinted(RAMP[2], tint),
    "--lc-3": tinted(RAMP[3], tint),
  } as CSSProperties;
}

/** The foil ramp as a CSS gradient list, stretched over `span` of the gradient. */
function foilStops(alpha = 1): string {
  return FOIL.map(([hex, at]) => {
    const [r, g, b] = rgbOf(hex);
    return `rgba(${r},${g},${b},${alpha}) ${(at * 100).toFixed(1)}%`;
  }).join(", ");
}

/**
 * Chrome as a CSS gradient: bright sky, a hard dark horizon, a lit floor.
 * `--lc-h` moves the horizon (0-100), so a surface can turn in the room.
 */
const CHROME_BG =
  "linear-gradient(180deg, var(--lc-3) 0%, var(--lc-2) calc(var(--lc-h, 50) * 1% - 16%), var(--lc-1) calc(var(--lc-h, 50) * 1% - 2%), var(--lc-0) calc(var(--lc-h, 50) * 1%), var(--lc-1) calc(var(--lc-h, 50) * 1% + 14%), var(--lc-2) calc(var(--lc-h, 50) * 1% + 34%), var(--lc-3) 100%)";

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

// Each part carries only the CSS it needs, so any one of them works on its own.
// Nothing is interpolated into these sheets; colours arrive as CSS variables.
// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".lc-scope :focus-visible,.lc-scope:focus-visible{outline:2px solid var(--lc-2);outline-offset:3px;border-radius:revert-layer}";

export type LcShow = {
  /** ISO date, "2026-11-14". */
  date: string;
  city: string;
  venue: string;
  status?: "on-sale" | "few-left" | "sold-out";
  href?: string;
};

const TICKET_DAY = new Intl.DateTimeFormat("en-GB", { day: "2-digit", timeZone: "UTC" });

const TICKET_MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

const TICKET_WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

export type HoloTicketCardProps = LcShow & {
  /** The link's label while tickets are on sale. */
  label?: string;
  className?: string;
};

/**
 * A tour date as a ticket with a holographic stub. The ticket is notched and
 * perforated where the stub tears off, and the stub carries the date in heavy
 * chrome numerals on a strip of foil. Under the pointer the ticket tilts
 * toward you, the foil's colour slides along its thin-film series as the
 * angle changes, fine diffraction lines shimmer, and a glare follows the
 * pointer. Keyboard focus tilts it too. Sold-out dates dim and lose their
 * link.
 */
export function HoloTicketCard({ date, city, venue, status = "on-sale", href = "#", label = "Tickets", className }: HoloTicketCardProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const d = new Date(date + "T00:00:00Z");
  const valid = !Number.isNaN(d.getTime());
  const day = valid ? TICKET_DAY.format(d) : "--";
  const month = valid ? TICKET_MONTH.format(d) : "";
  const weekday = valid ? TICKET_WEEKDAY.format(d) : "";
  const sold = status === "sold-out";

  const pose = (x: number, y: number, on: boolean) => {
    const el = ref.current;
    if (!el) return;
    const tilt = on && !reduced;
    el.style.setProperty("--rx", `${tilt ? ((0.5 - y) * 10).toFixed(2) : 0}deg`);
    el.style.setProperty("--ry", `${tilt ? ((x - 0.5) * 12).toFixed(2) : 0}deg`);
    el.style.setProperty("--fx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--fy", `${(y * 100).toFixed(1)}%`);
    el.style.setProperty("--glare", on ? "1" : "0");
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    pose((e.clientX - r.left) / (r.width || 1), (e.clientY - r.top) / (r.height || 1), true);
  };

  const cut = "calc(100% - 112px)";
  return (
    <div
      className={"lc-scope" + (className ? " " + className : "")}
      style={{ perspective: 900, filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.55))", fontFamily: SANS }}
      onPointerMove={onMove}
      onPointerLeave={() => pose(0.5, 0.5, false)}
      onFocus={() => pose(0.35, 0.3, true)}
      onBlur={() => pose(0.5, 0.5, false)}
    >
      <style>{FOCUS_CSS}</style>
      <div
        ref={ref}
        className="relative flex h-[168px] overflow-hidden rounded-[26px]"
        style={
          {
            ...finishVars(LC_FINISHES.chrome),
            "--rx": "0deg",
            "--ry": "0deg",
            "--fx": "50%",
            "--fy": "50%",
            "--glare": "0",
            transform: "rotateX(var(--rx)) rotateY(var(--ry))",
            transition: reduced ? "none" : `transform 260ms ${EASE}`,
            background: `linear-gradient(160deg, ${RAISED}, ${PANEL})`,
            boxShadow: `inset 0 0 0 1px ${LINE_2}, inset 0 1px 0 rgba(255,255,255,0.08)`,
            opacity: sold ? 0.62 : 1,
            // The notches where the stub tears: one bite from the top edge, one from the bottom.
            WebkitMask: `radial-gradient(circle 11px at ${cut} 0, transparent 10.5px, #000 11px) top / 100% 51% no-repeat, radial-gradient(circle 11px at ${cut} 100%, transparent 10.5px, #000 11px) bottom / 100% 51% no-repeat`,
            mask: `radial-gradient(circle 11px at ${cut} 0, transparent 10.5px, #000 11px) top / 100% 51% no-repeat, radial-gradient(circle 11px at ${cut} 100%, transparent 10.5px, #000 11px) bottom / 100% 51% no-repeat`,
          } as CSSProperties
        }
      >
        {/* A faint film over the whole ticket. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: `linear-gradient(115deg, ${foilStops(0.1)})`, backgroundSize: "300% 300%", backgroundPosition: "var(--fx) var(--fy)", mixBlendMode: "screen" }}
        />
        <div className="relative flex min-w-0 flex-1 flex-col justify-between p-5 pr-4">
          <div className="min-w-0">
            <p className="truncate text-[26px] leading-none" style={{ fontFamily: DISPLAY, fontWeight: 800, fontStretch: "125%", letterSpacing: "-0.02em", color: INK }}>
              {city}
            </p>
            <p className="mt-2 truncate text-[14px]" style={{ color: INK_2 }}>
              {venue}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] uppercase tracking-[0.16em]" style={{ fontFamily: MONO, color: status === "few-left" ? "#eadfc4" : INK_3, textDecoration: sold ? "line-through" : "none" }}>
              {sold ? "Sold out" : status === "few-left" ? "Few left" : "On sale"}
            </span>
            {sold ? (
              <span className="text-[13px]" style={{ color: INK_3 }}>
                No tickets
              </span>
            ) : (
              <a
                href={safeHref(href)}
                className="rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:text-white"
                style={{ color: INK, boxShadow: `inset 0 0 0 1px ${LINE_2}` }}
                aria-label={`${label}: ${city}, ${venue}`}
              >
                {label} →
              </a>
            )}
          </div>
        </div>
        {/* Perforation. */}
        <span aria-hidden className="absolute bottom-3 top-3 w-px" style={{ left: cut, backgroundImage: `linear-gradient(${LINE_2} 50%, transparent 50%)`, backgroundSize: "1px 7px" }} />
        {/* The stub: chrome numerals on a strip of foil. */}
        <div className="relative flex w-[112px] shrink-0 flex-col items-center justify-center overflow-hidden">
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(115deg, rgba(255,255,255,0.14) 0 1px, rgba(255,255,255,0) 1px 4px), linear-gradient(115deg, ${foilStops(0.55)})`,
              backgroundSize: "auto, 300% 300%",
              backgroundPosition: "0 0, var(--fx) var(--fy)",
              opacity: sold ? 0.3 : 0.9,
            }}
          />
          <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(12,13,16,0.25), rgba(12,13,16,0.6))" }} />
          <time dateTime={date} className="relative flex flex-col items-center">
            <span className="text-[11px] uppercase tracking-[0.2em]" style={{ fontFamily: MONO, color: "rgba(255,255,255,0.8)" }}>
              {weekday}
            </span>
            <span
              className="text-[46px] leading-[1.02]"
              style={{ fontFamily: DISPLAY, fontWeight: 800, fontStretch: "125%", letterSpacing: "-0.04em", color: "transparent", backgroundImage: CHROME_BG, WebkitBackgroundClip: "text", backgroundClip: "text" }}
            >
              {day}
            </span>
            <span className="text-[12px] uppercase tracking-[0.2em]" style={{ fontFamily: MONO, color: "rgba(255,255,255,0.9)" }}>
              {month}
            </span>
          </time>
        </div>
        {/* Glare. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at var(--fx) var(--fy), rgba(255,255,255,0.16), rgba(255,255,255,0) 45%)", opacity: "var(--glare)", transition: "opacity 300ms ease" }}
        />
      </div>
    </div>
  );
}
