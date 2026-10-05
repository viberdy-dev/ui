"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * AuraBookingPicker — a booking picker where the chosen time blooms into light.
 *
 * A treatment, a strip of days (closed days dimmed) and the times left on
 * the chosen day, as native radio groups. The time you pick blooms into a
 * grained halo and the summary line resolves to match. An email and one
 * filled button send the request to `onRequest`, which is required: the
 * picker never claims a booking on its own. Days count from `start` in UTC,
 * so the server and the browser draw the same strip.
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

const RESOLVE = "cubic-bezier(0.16, 1, 0.3, 1)";

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

const BOOK_CSS =
  "@keyframes dg-bloom{from{opacity:0;transform:scale(0.4)}to{opacity:1;transform:scale(1)}}" +
  "@keyframes dg-resolve{from{opacity:0;filter:blur(8px)}to{opacity:1;filter:blur(0)}}" +
  "@media (prefers-reduced-motion: reduce){.dg-bloom,.dg-resolve{animation:none!important}}";

const STRIP_FADE = "linear-gradient(90deg, #000 calc(100% - 48px), transparent)";

const DAY_NAME = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

const DAY_NUM = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });

const DAY_LONG = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export type DgBookingRequest = { treatment: string; date: string; time: string; email: string };

export type AuraBookingPickerProps = {
  treatments: { id: string; name: string; minutes: number }[];
  /** The first bookable day, as an ISO date ("2026-10-12"); days are counted from it in UTC. */
  start: string;
  days?: number;
  /** Weekdays the clinic is closed (0 Sunday to 6 Saturday). */
  closed?: number[];
  times?: string[];
  /** Whether a time is already taken on a day. */
  isTaken?: (date: string, time: string) => boolean;
  /** Called with the request. Resolve when it is received; throw to show `failed`. Required: the picker never claims a booking on its own. */
  onRequest: (request: DgBookingRequest) => Promise<void> | void;
  done?: string;
  failed?: string;
  tone?: DgTone;
  glow?: string;
  className?: string;
};

/**
 * A booking picker in three quiet steps: the treatment, a strip of days and
 * the times left on the chosen day. The time you choose blooms into a soft,
 * grained halo, and the summary line resolves to match. An email and one
 * filled button send the request to your handler, which is required; while
 * it runs the button says so, and when it resolves the summary turns into a
 * lit confirmation. Every choice is a native radio group; days count from
 * `start` in UTC, so the server and the browser draw the same strip.
 */
export function AuraBookingPicker({
  treatments,
  start,
  days = 10,
  closed = [1],
  times = ["09:30", "11:00", "12:30", "14:00", "15:30", "17:00", "18:30"],
  isTaken,
  onRequest,
  done = "Requested. We will confirm by email within the hour.",
  failed = "That did not go through. Try again, or call us.",
  tone = "day",
  glow,
  className,
}: AuraBookingPickerProps) {
  const t = toneOf(tone);
  const light = glowHex(glow ?? (tone === "jewel" ? "gold" : "jade"));
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const dates = useMemo(() => {
    const base = new Date(start + "T00:00:00Z");
    if (Number.isNaN(base.getTime())) return [];
    return Array.from({ length: Math.max(1, Math.min(60, days)) }, (_, i) => {
      const d = new Date(base.getTime() + i * 86400000);
      return { iso: d.toISOString().slice(0, 10), d, closed: closed.includes(d.getUTCDay()) };
    });
  }, [start, days, closed]);
  const [treatment, setTreatment] = useState(treatments[0]?.id ?? "");
  const [date, setDate] = useState(() => dates.find((d) => !d.closed)?.iso ?? "");
  const [time, setTime] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [hint, setHint] = useState("");
  const [badEmail, setBadEmail] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const tr = treatments.find((x) => x.id === treatment);
  const day = dates.find((d) => d.iso === date);
  const summary = [tr?.name, day ? DAY_LONG.format(day.d) : "", time, tr ? `${tr.minutes} min` : ""].filter(Boolean).join(" · ");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "sending" || state === "done") return;
    if (!day) {
      setHint("Choose a day first.");
      return;
    }
    if (!time) {
      setHint("Choose a time first.");
      return;
    }
    if (!emailRef.current?.checkValidity()) {
      setHint("Enter an email address for the confirmation.");
      setBadEmail(true);
      emailRef.current?.focus();
      return;
    }
    setHint("");
    setBadEmail(false);
    setState("sending");
    try {
      await onRequest({ treatment, date, time, email: email.trim() });
      setState("done");
    } catch {
      setState("error");
    }
  };

  const pill = (checked: boolean, disabled = false): CSSProperties => ({
    color: disabled ? t.ink3 : checked ? t.ink : t.ink2,
    background: checked ? t.raised : "transparent",
    boxShadow: checked ? `inset 0 0 0 1px ${t.line2}, ${t.shadow}` : `inset 0 0 0 1px ${t.line}`,
    textDecoration: disabled ? "line-through" : "none",
    cursor: disabled ? "not-allowed" : "pointer",
  });
  const labelCls = "mb-3 block text-[11px] uppercase tracking-[0.18em]";
  const done_ = state === "done";

  return (
    <form onSubmit={submit} noValidate className={"dg-scope w-full" + (className ? " " + className : "")} style={{ ...ringVar(tone), color: t.ink, fontFamily: SANS }}>
      <style>{FOCUS_CSS + BOOK_CSS}</style>
      <fieldset disabled={done_ || state === "sending"} className="m-0 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7 border-0 p-0">
        <div role="radiogroup" aria-labelledby={`${uid}-tl`}>
          <span id={`${uid}-tl`} className={labelCls} style={{ fontFamily: MONO, color: t.ink3 }}>
            Treatment
          </span>
          <div className="flex flex-wrap gap-2">
            {treatments.map((x) => (
              <label key={x.id} className="relative">
                <input type="radio" name={`${uid}-t`} value={x.id} checked={treatment === x.id} onChange={() => setTreatment(x.id)} className="peer sr-only" />
                <span className="inline-block rounded-full px-4 py-2 text-[14px] transition-all duration-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2" style={{ ...pill(treatment === x.id), outlineColor: "var(--dg-ring)" }}>
                  {x.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div role="radiogroup" aria-labelledby={`${uid}-dl`}>
          <span id={`${uid}-dl`} className={labelCls} style={{ fontFamily: MONO, color: t.ink3 }}>
            Day
          </span>
          {/* The strip scrolls sideways; its right edge fades so a cut-off day reads as more to come. */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ WebkitMaskImage: STRIP_FADE, maskImage: STRIP_FADE }}>
            {dates.map((d) => (
              <label key={d.iso} className="relative shrink-0">
                <input
                  type="radio"
                  name={`${uid}-d`}
                  value={d.iso}
                  checked={date === d.iso}
                  disabled={d.closed}
                  onChange={() => {
                    setDate(d.iso);
                    setTime("");
                  }}
                  className="peer sr-only"
                />
                <span
                  className="flex w-[60px] flex-col items-center rounded-[18px] py-2.5 transition-all duration-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
                  style={{ ...pill(date === d.iso, d.closed), textDecoration: "none", outlineColor: "var(--dg-ring)" }}
                >
                  <span className="text-[11px] uppercase tracking-[0.12em]" style={{ fontFamily: MONO }}>
                    {DAY_NAME.format(d.d)}
                  </span>
                  <span className="text-[22px] leading-tight" style={{ fontFamily: SERIF }}>
                    {DAY_NUM.format(d.d)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div role="radiogroup" aria-labelledby={`${uid}-hl`}>
          <span id={`${uid}-hl`} className={labelCls} style={{ fontFamily: MONO, color: t.ink3 }}>
            Time
          </span>
          <div className="flex flex-wrap gap-2">
            {times.map((tm) => {
              const taken = isTaken?.(date, tm) ?? false;
              const on = time === tm;
              return (
                <label key={tm} className="relative">
                  <input type="radio" name={`${uid}-h`} value={tm} checked={on} disabled={taken} onChange={() => setTime(tm)} className="peer sr-only" />
                  {on && (
                    <span aria-hidden className="dg-bloom pointer-events-none absolute -inset-4 rounded-full" style={{ animation: `dg-bloom 600ms ${EASE} both` }}>
                      <span className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(closest-side, ${rgba(light, 0.75)}, ${rgba(light, 0)})` }} />
                      <span className="absolute inset-0 rounded-full" style={{ backgroundImage: GRAIN_URL, mixBlendMode: "overlay", opacity: 0.6, WebkitMaskImage: "radial-gradient(closest-side, #000, transparent)", maskImage: "radial-gradient(closest-side, #000, transparent)" }} />
                    </span>
                  )}
                  <span
                    className="relative inline-block rounded-full px-4 py-2 text-[14px] tabular-nums transition-all duration-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
                    style={{ ...pill(on, taken), fontFamily: MONO, outlineColor: "var(--dg-ring)" }}
                  >
                    {tm}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </fieldset>

      <div className="relative mt-8 overflow-hidden rounded-[24px] p-5" style={{ background: done_ ? t.raised : t.panel, boxShadow: `inset 0 0 0 1px ${t.line}` }}>
        {done_ && (
          <span aria-hidden className="dg-bloom pointer-events-none absolute -left-10 -top-16 h-56 w-56 rounded-full" style={{ background: `radial-gradient(closest-side, ${rgba(light, 0.7)}, ${rgba(light, 0)})`, animation: `dg-bloom 900ms ${EASE} both` }} />
        )}
        <p key={summary + state} className="dg-resolve relative m-0 text-[19px] leading-snug" style={{ fontFamily: SERIF, fontWeight: 400, animation: `dg-resolve 600ms ${RESOLVE} both` }}>
          {done_ ? done : time ? summary : "Choose a time to see your visit."}
        </p>
        {!done_ && (
          <div className="relative mt-5 flex flex-col gap-3 min-[520px]:flex-row">
            <label htmlFor={`${uid}-email`} className="sr-only">
              Email for the confirmation
            </label>
            <input
              ref={emailRef}
              id={`${uid}-email`}
              type="email"
              required
              autoComplete="email"
              placeholder="Email for the confirmation"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state === "error") setState("idle");
              }}
              aria-describedby={`${uid}-msg`}
              aria-invalid={badEmail || undefined}
              className="h-[46px] min-w-0 flex-1 rounded-full px-5 text-[15px]"
              style={{ color: t.ink, boxShadow: `inset 0 0 0 1px ${t.line2}`, background: t.raised }}
            />
            <SoftGlowButton type="submit" tone={tone} disabled={state === "sending"}>
              {state === "sending" ? "Requesting" : "Request this time"}
            </SoftGlowButton>
          </div>
        )}
      </div>
      <p id={`${uid}-msg`} role="status" aria-live="polite" className="mt-3 min-h-[20px] text-[13px]" style={{ color: state === "error" || hint ? "#a0473b" : t.ink3 }}>
        {state === "error" ? failed : state === "done" ? done : hint}
      </p>
    </form>
  );
}
