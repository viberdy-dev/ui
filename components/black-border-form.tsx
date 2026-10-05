"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, FocusEvent, FormEvent, ReactNode } from "react";

/**
 * BlackBorderForm — neo-brutalist form fields that press in when you use
 * them and stamp their errors on.
 *
 * - BlackBorderField: a label, a 3px-bordered control on a hard 5px shadow,
 *   and an optional hint. Focus presses the control into its shadow (it
 *   moves 5px onto it and fills with the accent), 100ms linear. It validates
 *   itself with the browser's own constraint validation (required, type,
 *   minLength, pattern...): an error is stamped over the control's top-right
 *   corner as a tilted black tag, with no transition at all. Errors appear
 *   when a filled field loses focus or when the form is submitted, and clear
 *   the moment the value becomes valid.
 * - BlackBorderCheck: a 28px square checkbox on a 3px shadow, same rules.
 * - BlackBorderForm: a form that uses those fields as they are. On submit it
 *   lets the browser validate, suppresses the browser's own bubbles, focuses
 *   the first stamped field, and only calls onSubmit(formData) when every
 *   field is valid. While onSubmit runs the button shows it is busy; when it
 *   resolves, a "received" stamp lands on the form and takes focus; if it
 *   throws, a stamped retry line appears by the button.
 *
 * The form posts (method="post"), so without JavaScript nothing typed ends
 * up in the address bar. Type reads var(--font-display), var(--font-sans)
 * and var(--font-mono), so a buyer's next/font variables drop in.
 *
 * Needs Tailwind v4 (or v3.4+). No dependencies beyond React.
 */

const DISPLAY = 'var(--font-display, "Archivo", "Archivo Black", "Arial Black", "Helvetica Neue", Arial, sans-serif)';
const SANS = 'var(--font-sans, "Geist", "Inter", "Helvetica Neue", Arial, sans-serif)';
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

/** A form action is a URL the browser navigates to: allow https and same-site paths only. */
function safeAction(raw?: string) {
  if (!raw) return undefined;
  const v = raw.replace(/[\t\n\r]/g, "").trim();
  if (!v || v.includes("\\")) return undefined;
  if (/^https:/i.test(v)) return v;
  if (/^[/?]/.test(v) && !/^\/\//.test(v)) return v;
  return undefined;
}

function fillOf(v: string, fallback: string) {
  return own(FILLS, v) ? FILLS[v] : HEX.test(v) ? v : fallback;
}

export type BlackBorderMessages = Partial<Record<"valueMissing" | "typeMismatch" | "tooShort" | "tooLong" | "patternMismatch", string>>;

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** The stamp's text for a control's current validity, or "" when it is valid. */
function stampFor(el: Control, kind: string, messages: BlackBorderMessages) {
  const v = el.validity;
  if (v.valid) return "";
  if (v.valueMissing) return messages.valueMissing ?? (el instanceof HTMLSelectElement ? "Pick one" : "Required");
  if (v.typeMismatch) return messages.typeMismatch ?? (kind === "email" ? "Needs an @ and a domain" : kind === "url" ? "Needs https://" : "Wrong format");
  if (v.tooShort) return messages.tooShort ?? "Too short";
  if (v.tooLong) return messages.tooLong ?? "Too long";
  if (v.patternMismatch) return messages.patternMismatch ?? "Wrong format";
  return el.validationMessage || "Check this";
}

/**
 * The tilted black tag an error is stamped with. No transition, on purpose.
 * The text is rendered as text: never render a server message as HTML here.
 */
function Stamp({ id, text, ink, ground }: { id: string; text: string; ink: string; ground: string }) {
  return (
    <span id={id} aria-live="polite" className="pointer-events-none absolute -top-3.5 right-3 z-10">
      {text && (
        <span
          className="inline-flex h-7 -rotate-[2deg] items-center px-2 text-[11.5px] uppercase tracking-[0.06em]"
          style={{ background: ink, color: ground, fontFamily: MONO, fontWeight: 700 }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

type Shared = {
  /** The focus fill: a kit fill or #rrggbb. */
  accent?: keyof typeof FILLS | string;
  /** Border, shadow, label and stamp colour, #rrggbb. */
  ink?: string;
  messages?: BlackBorderMessages;
  className?: string;
};

export type BlackBorderFieldProps = Shared & {
  label: string;
  name: string;
  kind?: "text" | "email" | "tel" | "url" | "textarea" | "select";
  /** For kind "select": the options; the first is shown until one is picked. */
  options?: (string | { value: string; label: string })[];
  /** For kind "select": the empty first option's text. */
  prompt?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  defaultValue?: string;
  rows?: number;
  disabled?: boolean;
  /** An error from your server (e.g. "Already registered"), stamped until the value changes. */
  error?: string;
};

export function BlackBorderField({
  label,
  name,
  kind = "text",
  options = [],
  prompt = "Choose…",
  hint,
  required = false,
  placeholder,
  autoComplete,
  minLength,
  maxLength,
  pattern,
  defaultValue,
  rows = 4,
  disabled = false,
  error = "",
  accent = "yellow",
  ink = "#000000",
  messages = {},
  className = "",
}: BlackBorderFieldProps) {
  const id = useId();
  const [stamp, setStamp] = useState("");
  const [edited, setEdited] = useState(false);
  // A new server error is shown again even if the field was edited before (render-time reset).
  const [seenError, setSeenError] = useState(error);
  if (seenError !== error) {
    setSeenError(error);
    setEdited(false);
  }
  const shown = stamp || (edited ? "" : error);
  const line = HEX.test(ink) ? ink : "#000000";
  const fill = fillOf(accent, FILLS.yellow);
  const hintId = id + "-hint";
  const stampId = id + "-stamp";
  const describedBy = (hint ? hintId + " " : "") + stampId;

  const check = (el: Control) => setStamp(stampFor(el, kind, messages));
  const onInvalid = (e: FormEvent<Control>) => {
    // Our stamp replaces the browser's bubble.
    e.preventDefault();
    check(e.currentTarget);
  };
  const onBlur = (e: FocusEvent<Control>) => {
    if (e.currentTarget.value !== "") check(e.currentTarget);
  };
  const onChange = (e: ChangeEvent<Control>) => {
    setEdited(true);
    if (stamp) check(e.currentTarget);
  };

  const common = {
    id,
    name,
    required,
    disabled,
    "aria-invalid": shown ? true : undefined,
    "aria-describedby": describedBy,
    onInvalid,
    onBlur,
    onChange,
    className:
      "block w-full bg-transparent text-[16px] leading-[1.35] outline-none focus-visible:![outline:none] placeholder:opacity-45 disabled:cursor-not-allowed " +
      (kind === "textarea" ? "resize-y px-4 py-3" : "h-[50px] px-4"),
    style: { fontFamily: SANS, color: line } as CSSProperties,
  };

  let control: ReactNode;
  if (kind === "textarea") {
    control = <textarea {...common} rows={rows} placeholder={placeholder} minLength={minLength} maxLength={maxLength} defaultValue={defaultValue} />;
  } else if (kind === "select") {
    control = (
      <>
        <select {...common} defaultValue={defaultValue ?? ""} className={common.className + " cursor-pointer appearance-none pr-12"}>
          <option value="" disabled>
            {prompt}
          </option>
          {options.map((o) => {
            const opt = typeof o === "string" ? { value: o, label: o } : o;
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })}
        </select>
        <svg aria-hidden width="16" height="10" viewBox="0 0 16 10" fill="none" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
          <path d="M1.5 1.5L8 8L14.5 1.5" stroke={line} strokeWidth="3" strokeLinecap="square" />
        </svg>
      </>
    );
  } else {
    control = (
      <input
        {...common}
        type={kind}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        // An email is at most 254 characters; capping it keeps the pattern check cheap.
        maxLength={kind === "email" ? Math.min(maxLength ?? 254, 254) : maxLength}
        pattern={pattern}
        defaultValue={defaultValue}
        inputMode={kind === "email" ? "email" : kind === "tel" ? "tel" : kind === "url" ? "url" : undefined}
      />
    );
  }

  return (
    <div className={"flex flex-col gap-2 " + className} style={{ "--bbf-ink": line, "--bbf-fill": fill } as CSSProperties}>
      <label htmlFor={id} className="text-[15px] leading-none tracking-[-0.005em]" style={{ fontFamily: DISPLAY, fontWeight: 800, color: line }}>
        {label}
        {required && (
          <span aria-hidden className="ml-1">
            *
          </span>
        )}
      </label>
      <div
        className={
          "relative bg-white shadow-[5px_5px_0_0_var(--bbf-ink)] transition-[transform,translate,box-shadow] duration-100 ease-linear motion-reduce:transition-none " +
          "focus-within:translate-x-[5px] focus-within:translate-y-[5px] focus-within:bg-[var(--bbf-fill)] focus-within:shadow-none " +
          (disabled ? "opacity-60" : "")
        }
        style={{ border: "3px solid " + line }}
      >
        {control}
        <Stamp id={stampId} text={shown} ink={line} ground="#ffffff" />
      </div>
      {hint && (
        <p id={hintId} className="text-[12px] uppercase tracking-[0.06em]" style={{ fontFamily: MONO, color: line, opacity: 0.7 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export type BlackBorderCheckProps = Shared & {
  label: ReactNode;
  name: string;
  value?: string;
  required?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
};

export function BlackBorderCheck({
  label,
  name,
  value = "yes",
  required = false,
  defaultChecked,
  disabled = false,
  accent = "yellow",
  ink = "#000000",
  messages = {},
  className = "",
}: BlackBorderCheckProps) {
  const id = useId();
  const [stamp, setStamp] = useState("");
  const line = HEX.test(ink) ? ink : "#000000";
  const fill = fillOf(accent, FILLS.yellow);
  return (
    <div className={"relative flex items-start gap-3.5 " + className} style={{ "--bbf-ink": line, "--bbf-fill": fill } as CSSProperties}>
      <span className="relative mt-0.5 grid size-7 shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          defaultChecked={defaultChecked}
          aria-invalid={stamp ? true : undefined}
          aria-describedby={id + "-stamp"}
          onInvalid={(e) => {
            e.preventDefault();
            setStamp(messages.valueMissing ?? "Tick this to continue");
          }}
          onChange={(e) => {
            if (stamp && e.currentTarget.checked) setStamp("");
          }}
          className={
            "peer size-7 cursor-pointer appearance-none bg-white shadow-[3px_3px_0_0_var(--bbf-ink)] outline-none focus-visible:![outline:3px_dashed_var(--bbf-ink)] focus-visible:![outline-offset:3px] focus-visible:![border-radius:0] transition-[transform,translate,box-shadow] duration-100 ease-linear motion-reduce:transition-none " +
            "checked:bg-[var(--bbf-fill)] focus-visible:translate-x-[3px] focus-visible:translate-y-[3px] focus-visible:shadow-none disabled:cursor-not-allowed"
          }
          style={{ border: "3px solid " + line }}
        />
        <svg
          aria-hidden
          width="16"
          height="13"
          viewBox="0 0 16 13"
          fill="none"
          className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 peer-checked:block peer-focus-visible:ml-[3px] peer-focus-visible:mt-[3px]"
        >
          <path d="M1.5 6.5L6 11L14.5 1.5" stroke={line} strokeWidth="3" strokeLinecap="square" />
        </svg>
      </span>
      <label htmlFor={id} className="cursor-pointer pt-0.5 text-[15px] leading-[1.45]" style={{ fontFamily: SANS, color: line }}>
        {label}
      </label>
      <Stamp id={id + "-stamp"} text={stamp} ink={line} ground="#ffffff" />
    </div>
  );
}

export type BlackBorderFormProps = {
  children: ReactNode;
  /** Called with the form's data once every field is valid. May return a promise. */
  onSubmit?: (data: FormData) => void | Promise<void>;
  submitLabel?: string;
  busyLabel?: string;
  /** The stamp that lands when onSubmit resolves. */
  doneLabel?: string;
  doneNote?: string;
  /** Shown by the button if onSubmit throws. */
  failLabel?: string;
  /** The submit button's fill: a kit fill or #rrggbb. */
  accent?: keyof typeof FILLS | string;
  ink?: string;
  /** Where the form posts when JavaScript is off: https or a same-site path (anything else is dropped). */
  action?: string;
  className?: string;
};

export function BlackBorderForm({
  children,
  onSubmit,
  submitLabel = "Send",
  busyLabel = "Sending",
  doneLabel = "Received",
  doneNote = "We'll reply within a working day.",
  failLabel = "Didn't send. Try again",
  accent = "yellow",
  ink = "#000000",
  action,
  className = "",
}: BlackBorderFormProps) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "fail">("idle");
  const [pressed, setPressed] = useState(false);
  const focusedThisRound = useRef(false);
  const run = useRef(0);
  const done = useRef<HTMLDivElement>(null);
  const line = HEX.test(ink) ? ink : "#000000";
  const fill = fillOf(accent, FILLS.yellow);

  useEffect(() => {
    if (state === "done") done.current?.focus();
  }, [state]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === "busy" || state === "done") return;
    const data = new FormData(e.currentTarget);
    const mine = ++run.current;
    setState("busy");
    try {
      await onSubmit?.(data);
      if (run.current === mine) setState("done");
    } catch {
      if (run.current === mine) setState("fail");
    }
  };

  const release = () => setPressed(false);
  const busy = state === "busy";

  return (
    <form
      method="post"
      action={safeAction(action)}
      onSubmit={submit}
      // The first field to fail in a submit attempt takes focus; the rest just stamp.
      onInvalidCapture={(e) => {
        if (focusedThisRound.current) return;
        focusedThisRound.current = true;
        (e.target as HTMLElement).focus();
        // Every invalid event of one submit attempt fires in the same task.
        window.setTimeout(() => {
          focusedThisRound.current = false;
        }, 0);
      }}
      className={"relative flex flex-col gap-6 " + className}
      style={{ "--bbf-ink": line } as CSSProperties}
    >
      {/* Once received, the fields behind the stamp are disabled so Tab cannot reach them. */}
      <fieldset disabled={state === "done"} className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0">
        {children}
      </fieldset>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-1">
        <button
          type="submit"
          aria-busy={busy || undefined}
          aria-disabled={busy || state === "done" || undefined}
          onPointerDown={(e) => {
            if (e.button === 0 && !busy) setPressed(true);
          }}
          onPointerUp={release}
          onPointerLeave={release}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !e.repeat && !busy) setPressed(true);
          }}
          onKeyUp={release}
          onBlur={release}
          className={
            "inline-flex h-14 items-center gap-2.5 px-7 text-[17px] leading-none focus-visible:![outline-offset:4px] transition-[transform,translate,box-shadow] duration-100 ease-linear " +
            "focus-visible:![outline-style:dashed] focus-visible:![outline-width:3px] focus-visible:![border-radius:0] motion-reduce:transition-none " +
            (busy
              ? "cursor-progress shadow-[5px_5px_0_0_var(--bbf-ink)]"
              : pressed
                ? "translate-x-[5px] translate-y-[5px] shadow-none"
                : "shadow-[5px_5px_0_0_var(--bbf-ink)] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[7px_7px_0_0_var(--bbf-ink)]")
          }
          style={{ background: fill, color: line, border: "3px solid " + line, outlineColor: line, fontFamily: DISPLAY, fontWeight: 800 }}
        >
          {busy ? busyLabel + "…" : submitLabel}
          {!busy && (
            <svg aria-hidden width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path d="M0 7H15M9 1.5L15 7L9 12.5" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
            </svg>
          )}
        </button>
        <p role="status" className="text-[12px] uppercase tracking-[0.06em]" style={{ fontFamily: MONO, color: line }}>
          {state === "fail" && (
            <span className="inline-flex h-7 -rotate-[2deg] items-center px-2" style={{ background: line, color: "#ffffff", fontWeight: 700 }}>
              {failLabel}
            </span>
          )}
        </p>
      </div>

      {state === "done" && (
        <div ref={done} tabIndex={-1} role="status" className="absolute inset-0 z-20 grid place-items-center" style={{ background: "rgba(255,255,255,0.72)", outline: "none", borderRadius: 0 }}>
          <div
            className="flex -rotate-[4deg] flex-col items-center gap-2 px-7 py-5 text-center shadow-[8px_8px_0_0_var(--bbf-ink)]"
            style={{ background: fill, border: "3px solid " + line, color: line }}
          >
            <span className="text-[44px] uppercase leading-[0.9] tracking-[-0.02em]" style={{ fontFamily: DISPLAY, fontWeight: 900 }}>
              {doneLabel}
            </span>
            {doneNote && (
              <span className="text-[12.5px] uppercase tracking-[0.06em]" style={{ fontFamily: MONO, fontWeight: 600 }}>
                {doneNote}
              </span>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
