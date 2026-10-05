"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

/**
 * WakeTimeWheel — set the alarm on a pair of wheels.
 *
 * Hours and minutes are two snap-scrolling columns (native scrolling, with
 * momentum) whose rows turn away in perspective around a lens; each is a
 * spinbutton for the arrow keys, Page Up and Down, Home and End. Beneath,
 * the time the sunrise will start. Submits the time (and posts it with
 * `name`); without a handler it confirms in a status line.
 *
 * Part of the Modern Minimal kit: a paper-white room (#f5f5f2, surfaces
 * #ffffff, ink #141412) and one light, dawn #ffa64d, only ever as light.
 * Two-layer shadows from one light above; scroll binds values directly,
 * with no easing. Inter Tight through var(--font-inter-tight) for display
 * over Geist. Respects prefers-reduced-motion. No dependencies beyond React.
 * Paste it as its own file: it repeats the kit's small helpers, which would
 * clash in one module. Load Inter Tight with next/font (variable:
 * "--font-inter-tight") on a parent, or from Google Fonts or @fontsource.
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

const DISPLAY = 'var(--font-inter-tight, "Inter Tight", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** A paper-white room and one light. */
const PAPER = {
  ground: "#f5f5f2",
  surface: "#ffffff",
  well: "#ecebe6",
  solid: "#141412",
  ink: "rgba(20,20,18,0.92)",
  ink2: "rgba(20,20,18,0.6)",
  ink3: "rgba(20,20,18,0.38)",
  line: "rgba(20,20,18,0.08)",
  line2: "rgba(20,20,18,0.14)",
  dawn: "#ffa64d",
  night: "#0e0f11",
} as const;

/** Light from above: a 1px contact shadow and a soft ambient one, both falling the same way. */
const SHADOW = "0 1px 2px rgba(20,20,18,0.06), 0 24px 48px -12px rgba(20,20,18,0.1)";

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

// Each part carries only the CSS it needs, so any one of them works on its own.
// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".mm-scope :focus-visible,.mm-scope:focus-visible{outline:2px solid var(--mm-ring,#141412)!important;outline-offset:3px;border-radius:revert-layer}";

const MM_BUTTON_INK = {
  solid: { bg: PAPER.solid, fg: "#f5f5f2", border: "transparent", shadow: true },
  light: { bg: PAPER.surface, fg: PAPER.solid, border: "rgba(20,20,18,0.08)", shadow: true },
  outline: { bg: "transparent", fg: PAPER.solid, border: "rgba(20,20,18,0.22)", shadow: false },
} as const;

export type MmButtonVariant = keyof typeof MM_BUTTON_INK;

/**
 * WeightPressButton — a button whose press you can see in its type.
 *
 * A pill in Inter Tight. Hover and the label thickens a step and the button
 * lifts a pixel as its ambient shadow widens; press and the label goes bold
 * under your finger while the button sinks, the ambient shadow collapsing to
 * the contact one, then springs back past rest on release. Both shadows fall
 * from one light above. Solid, light and outline; a link when given an href.
 * CSS transitions on a variable weight, no animation library.
 */
export function WeightPressButton({
  children,
  href,
  onClick,
  type = "button",
  variant = "solid",
  size = "lg",
  disabled = false,
  ariaLabel,
  ariaPressed,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: MmButtonVariant;
  size?: "lg" | "md" | "sm";
  disabled?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
  className?: string;
}) {
  const ink = MM_BUTTON_INK[variant] ?? MM_BUTTON_INK.solid;
  const [state, setState] = useState<"rest" | "hover" | "down">("rest");
  const reduced = useReducedMotion();
  const weight = state === "down" ? 680 : state === "hover" ? 560 : 500;
  const shadow = !ink.shadow
    ? "none"
    : state === "down"
      ? "0 1px 1px rgba(20,20,18,0.1), 0 6px 12px -8px rgba(20,20,18,0.14)"
      : state === "hover"
        ? "0 1px 2px rgba(20,20,18,0.06), 0 30px 56px -14px rgba(20,20,18,0.16)"
        : SHADOW;
  const pad = size === "sm" ? "h-9 px-4 text-[13px]" : size === "md" ? "h-11 px-5 text-[14px]" : "h-[52px] px-7 text-[15px]";
  const common = {
    "aria-label": ariaLabel,
    className: "mm-scope relative inline-flex select-none items-center justify-center rounded-full no-underline outline-none " + pad + (disabled ? " pointer-events-none opacity-40 " : " ") + className,
    style: {
      background: ink.bg,
      color: ink.fg,
      border: `1px solid ${ink.border}`,
      boxShadow: shadow,
      fontFamily: DISPLAY,
      fontWeight: weight,
      letterSpacing: "-0.01em",
      transform: state === "down" ? "translateY(1px) scale(0.985)" : state === "hover" ? "translateY(-1px)" : "none",
      transition: reduced
        ? "none"
        : state === "rest"
          ? `transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 260ms ${EASE}, font-weight 220ms ${EASE}`
          : `transform 160ms ${EASE}, box-shadow 160ms ${EASE}, font-weight 160ms ${EASE}`,
    } as CSSProperties,
    onPointerEnter: () => setState("hover"),
    onPointerLeave: () => setState("rest"),
    onPointerDown: () => setState("down"),
    onPointerUp: () => setState("hover"),
    onPointerCancel: () => setState("rest"),
    onFocus: () => setState((s) => (s === "rest" ? "hover" : s)),
    onBlur: () => setState("rest"),
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key === "Enter" || (e.key === " " && !href)) setState("down");
    },
    onKeyUp: () => setState("hover"),
  };
  // The label is laid out at the boldest weight too, invisibly, so the button never changes width.
  const label = (
    <span className="relative inline-grid">
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap" style={{ fontWeight: 680 }}>
        {children}
      </span>
      <span className="col-start-1 row-start-1 whitespace-nowrap text-center">{children}</span>
    </span>
  );
  if (href) {
    return (
      <>
        <style>{FOCUS_CSS}</style>
        <a href={safeHref(href)} onClick={onClick} {...common}>
          {label}
        </a>
      </>
    );
  }
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <button type={type} onClick={onClick} disabled={disabled} aria-pressed={ariaPressed} {...common}>
        {label}
      </button>
    </>
  );
}

const MM_ROW = 40;

/** One wheel: a snap-scrolling column whose rows turn away in perspective, and a spinbutton for keys. */
function MmWheel({ label, values, value, onChange, format }: { label: string; values: number[]; value: number; onChange: (v: number) => void; format: (v: number) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useReducedMotion();
  const idx = Math.max(0, values.indexOf(value));
  const settle = useRef(0);
  const seed = useRef(idx);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // The rows turn by their distance from the middle; drawn on scroll, not on a timer.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const draw = () => {
      raf = 0;
      const c = el.scrollTop / MM_ROW;
      rows.current.forEach((r, i) => {
        if (!r) return;
        const d = clamp(i - c, -3, 3);
        r.style.transform = `perspective(360px) rotateX(${(-d * 22).toFixed(2)}deg) translateZ(${(-Math.abs(d) * 6).toFixed(2)}px)`;
        r.style.opacity = (1 - Math.min(0.85, Math.abs(d) * 0.3)).toFixed(3);
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(draw);
      clearTimeout(settle.current);
      settle.current = window.setTimeout(() => {
        const i = clamp(Math.round(el.scrollTop / MM_ROW), 0, values.length - 1);
        if (values[i] !== undefined) onChangeRef.current(values[i]);
      }, 140);
    };
    el.scrollTop = seed.current * MM_ROW;
    draw();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      clearTimeout(settle.current);
    };
  }, [values]);

  const go = (i: number) => {
    const el = ref.current;
    const j = clamp(i, 0, values.length - 1);
    if (el) el.scrollTo({ top: j * MM_ROW, behavior: reduced ? "auto" : "smooth" });
    onChange(values[j]);
  };
  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    // Step from where the wheel is now, even mid-fling, not from the last settled value.
    const el = ref.current;
    const here = el ? clamp(Math.round(el.scrollTop / MM_ROW), 0, values.length - 1) : idx;
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : e.key === "PageDown" ? 3 : e.key === "PageUp" ? -3 : 0;
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      go(e.key === "Home" ? 0 : values.length - 1);
      return;
    }
    if (!step) return;
    e.preventDefault();
    clearTimeout(settle.current);
    go(here + step);
  };
  return (
    <div
      ref={ref}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={values[0]}
      aria-valuemax={values[values.length - 1]}
      aria-valuenow={value}
      aria-valuetext={format(value)}
      onKeyDown={onKey}
      className="relative h-[200px] w-[76px] snap-y snap-mandatory overflow-y-scroll outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ paddingBlock: MM_ROW * 2, maskImage: "linear-gradient(transparent, #000 30%, #000 70%, transparent)", WebkitMaskImage: "linear-gradient(transparent, #000 30%, #000 70%, transparent)" }}
    >
      {values.map((v, i) => (
        <div
          key={v}
          ref={(el) => void (rows.current[i] = el)}
          aria-hidden
          onClick={() => go(i)}
          className="flex snap-center items-center justify-center tabular-nums"
          style={{ height: MM_ROW, fontFamily: DISPLAY, fontSize: 26, fontWeight: 560, letterSpacing: "-0.02em", color: PAPER.solid, cursor: "pointer" }}
        >
          {format(v)}
        </div>
      ))}
    </div>
  );
}

export type MmAlarm = { time: string; hours: number; minutes: number; sunriseFrom: string };

/**
 * WakeTimeWheel — set the alarm on a pair of wheels.
 *
 * Hours and minutes are two snap-scrolling columns (native scrolling, so
 * they carry momentum and settle on a value) whose rows turn away in
 * perspective above and below a lens; each column is a spinbutton you can
 * drive with the arrow keys, Page Up and Down, Home and End. Beneath, the
 * time the sunrise will start. Submitting sends the time (and posts it with
 * `name` in a form); without a handler it confirms in a status line.
 */
export function WakeTimeWheel({
  label = "Wake at",
  defaultValue = "06:30",
  step = 5,
  sunrise = 30,
  name,
  submitLabel = "Set alarm",
  onSubmit,
  className = "",
}: {
  label?: string;
  /** "HH:MM", 24-hour. */
  defaultValue?: string;
  /** Minutes between choices (1-30). */
  step?: number;
  /** How many minutes the sunrise runs before the alarm. */
  sunrise?: number;
  name?: string;
  submitLabel?: string;
  onSubmit?: (value: MmAlarm) => void;
  className?: string;
}) {
  const st = clamp(Math.round(step), 1, 30);
  // A malformed default ("6", "", "6:3O") falls back to zero rather than reaching NaN.
  const parts = defaultValue.split(":");
  const h0 = Number.isFinite(Number(parts[0])) ? Number(parts[0]) : 0;
  const m0 = Number.isFinite(Number(parts[1])) ? Number(parts[1]) : 0;
  const [hours, setHours] = useState(clamp(h0, 0, 23));
  const [minutes, setMinutes] = useState(clamp(Math.round(m0 / st) * st, 0, 60 - st));
  const [done, setDone] = useState("");
  const labelId = useId();
  const [hourValues] = useState(() => Array.from({ length: 24 }, (_, i) => i));
  const [minuteValues] = useState(() => Array.from({ length: Math.floor(60 / st) }, (_, i) => i * st));
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(hours)}:${pad(minutes)}`;
  const from = hours * 60 + minutes - clamp(sunrise, 0, 180);
  const fromText = `${pad(Math.floor(((from % 1440) + 1440) % 1440 / 60))}:${pad((((from % 1440) + 1440) % 1440) % 60)}`;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value: MmAlarm = { time, hours, minutes, sunriseFrom: fromText };
    onSubmit?.(value);
    // Without a handler nothing is saved, so the status says what was chosen, not that it was set.
    setDone(onSubmit ? `Set for ${time}. The sunrise starts at ${fromText}.` : `Chosen: ${time}, sunrise from ${fromText}. Connect onSubmit to save it.`);
  };

  return (
    <form onSubmit={submit} className={"mm-scope flex w-full flex-col items-center gap-6 " + className} style={{ fontFamily: SANS, color: PAPER.ink }}>
      <style>{FOCUS_CSS}</style>
      <div className="flex w-full max-w-[360px] flex-col items-center gap-4 rounded-[28px] px-6 py-6" style={{ background: PAPER.surface, boxShadow: SHADOW, border: `1px solid ${PAPER.line}` }}>
        <span id={labelId} className="text-[11px] uppercase" style={{ fontFamily: MONO, letterSpacing: "0.16em", color: PAPER.ink3 }}>
          {label}
        </span>
        <div role="group" aria-labelledby={labelId} className="relative flex items-center gap-1">
          <span aria-hidden className="pointer-events-none absolute inset-x-[-10px] top-1/2 h-[40px] -translate-y-1/2 rounded-[12px]" style={{ background: PAPER.well }} />
          <MmWheel label="Hours" values={hourValues} value={hours} onChange={setHours} format={pad} />
          <span aria-hidden className="relative text-[26px] font-semibold" style={{ fontFamily: DISPLAY, color: PAPER.ink3 }}>
            :
          </span>
          <MmWheel label="Minutes" values={minuteValues} value={minutes} onChange={setMinutes} format={pad} />
        </div>
        <p className="m-0 text-[13px] tabular-nums" style={{ color: PAPER.ink2 }}>
          Sunrise from <span style={{ color: PAPER.solid }}>{fromText}</span> · alarm at <span style={{ color: PAPER.solid }}>{time}</span>
        </p>
        {name ? <input type="hidden" name={name} value={time} /> : null}
        <WeightPressButton type="submit" size="md">
          {submitLabel}
        </WeightPressButton>
      </div>
      <p role="status" className="m-0 min-h-[20px] text-[13px]" style={{ color: PAPER.ink2 }}>
        {done}
      </p>
    </form>
  );
}
