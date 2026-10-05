"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * HangingLabelInput — a contact form whose labels hang one gutter off the lattice and step into line on focus.
 *
 * Each field sits on the grid; its numbered label hangs a gutter off its
 * leading edge and steps into line in 160ms when you use it. The third row
 * breaks by the rule. Real labels, capped lengths and validation that marks
 * the field at fault; given onSubmit it sends and clears, and without one it
 * says it isn't connected. Validate again on the server.
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

const BG_BUTTON_INK = {
  paper: { label: FIELD.paper, text: FIELD.ink, socket: "rgba(241,240,232,0.42)", socketOn: "rgba(241,240,232,0.7)", ground: "field" },
  ink: { label: FIELD.ink, text: FIELD.paper, socket: "rgba(10,10,31,0.34)", socketOn: "rgba(10,10,31,0.6)", ground: "paper" },
} as const;

export type BgButtonTone = keyof typeof BG_BUTTON_INK;

/**
 * OffsetTargetButton — a button whose label plate hangs off its target, along
 * the grid's own axis, and seats into it when pressed.
 *
 * The target is the socket, a hairline rectangle exactly where a button
 * should be. The label plate is the same size and hangs off its leading edge
 * by `hang` (8px, a third of a gutter at 1280): the kit's overshoot at the
 * scale of a control, sideways only, never a diagonal drop shadow. Hover or
 * focus it and it hangs further (14px) and the bracket lights; press and it
 * seats into the socket in 120ms, then hangs again on release (200ms). The
 * socket never moves, and the strip the label hangs over is part of the
 * button, so every pixel of the label is clickable. Set `breaks` when the
 * button is the third of a run, and the bracket stays on. Paper for the
 * field, ink for paper; the focus ring follows. A link when given an href.
 */
export function OffsetTargetButton({
  children,
  href,
  onClick,
  type = "button",
  tone = "paper",
  size = "lg",
  hang = 8,
  breaks = false,
  disabled = false,
  ariaLabel,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  onClick?: (e: ReactMouseEvent<HTMLElement>) => void;
  type?: "button" | "submit";
  tone?: BgButtonTone;
  size?: "lg" | "md" | "sm";
  /** How far the label hangs off its target, in px. */
  hang?: number;
  /** The rule fired on this button (the third of a run): keep the bracket on. */
  breaks?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const ink = BG_BUTTON_INK[tone] ?? BG_BUTTON_INK.paper;
  const [state, setState] = useState<"rest" | "hover" | "down">("rest");
  const reduced = useReducedMotion();
  // Resting, the label hangs by `hang`; hovered or focused it reaches further (1.75x); pressed it seats at 0.
  const off = state === "down" ? 0 : state === "hover" ? hang * 1.75 : hang;
  const pad = size === "sm" ? "h-10 px-4 text-[14px]" : size === "md" ? "h-12 px-5 text-[16px]" : "h-14 px-6 text-[18px]";
  const handlers = {
    "aria-label": ariaLabel,
    className: "bg-scope group relative inline-flex select-none no-underline outline-none " + pad + (disabled ? " pointer-events-none opacity-40 " : " ") + className,
    style: { WebkitTapHighlightColor: "transparent", touchAction: "manipulation", borderRadius: 0, ...bgMark(ink.ground) } as CSSProperties,
    onPointerEnter: () => setState("hover"),
    onPointerLeave: () => setState("rest"),
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button === 0) setState("down");
    },
    onPointerUp: () => setState("hover"),
    onPointerCancel: () => setState("rest"),
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => {
      if (!e.repeat && (e.key === "Enter" || (e.key === " " && !href))) setState("down");
    },
    onKeyUp: () => setState("hover"),
    onFocus: () => setState((s) => (s === "rest" ? "hover" : s)),
    onBlur: () => setState("rest"),
  };
  const body = (
    <>
      {/* The socket: the real target, drawn as a hairline. */}
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ boxShadow: `inset 0 0 0 1px ${state === "rest" ? ink.socket : ink.socketOn}` }} />
      {/* The strip the label hangs over belongs to the button, so the whole label takes the click. */}
      <span aria-hidden className="absolute inset-y-0 right-full" style={{ width: hang * 1.75 }} />
      {/* The label plate, hanging off the socket's leading edge. */}
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap"
        style={{
          background: ink.label,
          color: ink.text,
          transform: `translateX(${-off}px)`,
          transition: reduced ? "none" : `transform ${state === "down" ? 120 : 200}ms ${BG_EASE}`,
          fontFamily: DISPLAY,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        <BgBracket on={breaks || state !== "rest"} size={12} />
        {children}
      </span>
      {/* An invisible copy keeps the button as wide as its label. */}
      <span aria-hidden className="invisible flex items-center whitespace-nowrap" style={{ fontFamily: DISPLAY, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {children}
      </span>
    </>
  );
  if (href && !disabled) {
    return (
      <>
        <style>{FOCUS_CSS}</style>
        <a href={safeHref(href)} onClick={onClick} {...handlers}>
          {body}
        </a>
      </>
    );
  }
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <button type={type} onClick={onClick} disabled={disabled} {...handlers}>
        {body}
      </button>
    </>
  );
}

export type BgBrief = { name: string; email: string; brief: string; budget: string };

export type BgFormLabels = { name: string; email: string; brief: string; budget: string; choose: string; sending: string };

// Linear in the input (no nested quantifiers to backtrack), and it refuses "a@b..c" and "a@b.c.".
const BG_EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/**
 * HangingLabelInput — a contact form whose labels hang one gutter off the
 * lattice and step into line when you use the field.
 *
 * Each field sits on the grid; its numbered mono label hangs one gutter to
 * the left of it, off the lattice by the kit's measure. Focus a field and its
 * label steps into line with it in 160ms, its number marked (an active
 * state). The rows are a run, so the third breaks by the rule: the brief's
 * box grows two gutters out at its leading edge with the bracket, and its
 * label hangs off the overshoot. Real labels, lengths capped, validation that
 * marks and focuses the field at fault; given `onSubmit` it sends, thanks
 * you and clears the form, and without one it says it isn't connected (and
 * warns in the console). This checks the brief in the browser only: validate
 * it again on the server.
 */
export function HangingLabelInput({
  title = "Tell us what has to be true.",
  budgets = ["Under €10k", "€10k to €40k", "Over €40k", "Not sure yet"],
  labels = { name: "Name", email: "Email", brief: "The brief", budget: "Budget", choose: "Choose one", sending: "Sending" },
  button = "Send the brief",
  success = "Thank you. We'll be in touch.",
  onSubmit,
  className = "",
}: {
  title?: string;
  budgets?: string[];
  labels?: BgFormLabels;
  button?: string;
  success?: string;
  /** Called with a valid brief; may return a promise. Throw to show an error. */
  onSubmit?: (brief: BgBrief) => void | Promise<void>;
  className?: string;
}) {
  const id = useId();
  const [focus, setFocus] = useState(-1);
  const [status, setStatus] = useState<{ tone: "ok" | "err" | "note"; text: string } | null>(null);
  const [bad, setBad] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const reduced = useReducedMotion();

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const brief: BgBrief = {
      name: String(f.get("name") ?? "").trim(),
      email: String(f.get("email") ?? "").trim(),
      brief: String(f.get("brief") ?? "").trim(),
      budget: String(f.get("budget") ?? ""),
    };
    const fault = !brief.name ? "name" : brief.email.length > 254 || !BG_EMAIL.test(brief.email) ? "email" : "";
    setBad(fault);
    if (fault) {
      setStatus({ tone: "err", text: fault === "name" ? "Add your name." : "That doesn't look like an email address." });
      form.querySelector<HTMLElement>(`[name="${fault}"]`)?.focus();
      return;
    }
    if (!onSubmit) {
      console.warn("HangingLabelInput: pass onSubmit to send the brief.");
      setStatus({ tone: "note", text: "The brief looks right, but this form isn't connected yet." });
      return;
    }
    setBusy(true);
    try {
      await onSubmit(brief);
      if (!alive.current) return;
      setStatus({ tone: "ok", text: success });
      form.reset();
    } catch {
      if (alive.current) setStatus({ tone: "err", text: "That didn't go through. Try again in a moment." });
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const rows = [
    { key: "name", label: labels.name, el: "input" as const, type: "text", auto: "name", max: 120 },
    { key: "email", label: labels.email, el: "input" as const, type: "email", auto: "email", max: 254 },
    { key: "brief", label: labels.brief, el: "textarea" as const, type: "", auto: "off", max: 4000 },
    { key: "budget", label: labels.budget, el: "select" as const, type: "", auto: "off", max: 0 },
  ];
  // Paper fields on paper: the boundary is ink at 50%, 3.5:1, so the field reads as a field.
  const field: CSSProperties = { background: FIELD.paper, color: FIELD.ink, boxShadow: `inset 0 0 0 1px ${FIELD.edgeOnPaper}`, fontFamily: SANS, fontSize: 16, borderRadius: 0 };

  return (
    <form method="post" onSubmit={submit} noValidate className={"bg-scope relative w-full @container " + className} style={{ fontFamily: SANS, color: FIELD.ink, ...bgMark("paper") }}>
      <style>{FOCUS_CSS + GRID_CSS}</style>
      <div className="bg-grid gap-y-9">
        <h2 className="col-span-full m-0 text-[clamp(32px,5cqw,72px)] leading-[0.86] @3xl:col-start-3 @3xl:col-end-11" style={{ fontFamily: DISPLAY, fontWeight: 800, textTransform: "uppercase" }}>
          {title}
        </h2>
        {rows.map((r, i) => {
          const breaks = bgBreaks(i, rows.length);
          const on = focus === i;
          const fid = `${id}-${r.key}`;
          const common = {
            id: fid,
            name: r.key,
            onFocus: () => setFocus(i),
            onBlur: () => setFocus(-1),
            "aria-invalid": bad === r.key ? true : undefined,
            "aria-describedby": bad === r.key ? id + "-status" : undefined,
          };
          return (
            <div key={r.key} className="relative col-span-full @3xl:col-start-3 @3xl:col-end-11">
              {/* The label hangs one gutter off its field's leading edge (on the breaking row, off the overshoot) and steps into line with it on focus. */}
              <label
                htmlFor={fid}
                className="absolute -top-6 left-0 flex items-baseline gap-2 text-[11px] uppercase"
                style={{
                  fontFamily: MONO,
                  letterSpacing: "0.08em",
                  color: FIELD.ink2,
                  transform: `translateX(calc(var(--bg-g, 24px) * ${(breaks ? -2 : 0) - (on ? 0 : 1)}))`,
                  transition: reduced ? "none" : `transform 160ms ${BG_EASE}`,
                }}
              >
                <span style={{ color: on ? FIELD.paper : FIELD.ink3, background: on ? FIELD.ink : "transparent", padding: on ? "0 5px" : 0 }}>{String(i + 1).padStart(2, "0")}</span>
                {r.label}
              </label>
              <div data-bg-module="" data-bg-index={i + 1} data-bg-break={breaks ? "true" : "false"} className="relative" style={{ marginInlineStart: breaks ? "calc(var(--bg-g, 24px) * -2)" : 0 }}>
                <BgBracket on={breaks} />
                {r.el === "textarea" ? (
                  <textarea {...common} rows={4} maxLength={r.max} className="block w-full resize-y px-4 py-3 outline-none" style={{ ...field, paddingInlineStart: breaks ? "calc(16px + var(--bg-g, 24px) * 2)" : 16 }} />
                ) : r.el === "select" ? (
                  <select {...common} defaultValue="" className="block h-12 w-full px-4 outline-none" style={field}>
                    <option value="" disabled>
                      {labels.choose}
                    </option>
                    {budgets.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                ) : (
                  <input {...common} type={r.type} autoComplete={r.auto} maxLength={r.max} required className="block h-12 w-full px-4 outline-none" style={field} />
                )}
              </div>
            </div>
          );
        })}
        <div className="col-span-full flex flex-wrap items-center gap-5 @3xl:col-start-3 @3xl:col-end-11">
          <OffsetTargetButton type="submit" tone="ink" disabled={busy}>
            {busy ? labels.sending : button}
          </OffsetTargetButton>
          <p id={id + "-status"} role="status" aria-live="polite" className="m-0 text-[14px]" style={{ color: status?.tone === "err" ? FIELD.ink : FIELD.ink2, fontWeight: status?.tone === "err" ? 600 : 400 }}>
            {status?.text ?? ""}
          </p>
        </div>
      </div>
    </form>
  );
}
