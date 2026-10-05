"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, FormEvent } from "react";

/**
 * DeployLogInput — an email field that answers with a streaming log.
 *
 * On submit it validates the address, then streams short log lines under
 * itself (a spinner turning into a check per step) while a beam of light
 * runs along its top edge, and finally confirms. The last step waits for
 * onSubmit, so the log never claims success before the work is done, and
 * a rejection shows its message in the log. Stale runs are ignored.
 *
 * Part of the Dark Precision kit: OLED black, 1px hairlines, one cool accent
 * used only as light (default #4fd1ff; also mint, amber, white or any
 * #rrggbb). Fonts come from CSS variables with Geist fallbacks. Respects
 * prefers-reduced-motion. No dependencies beyond React.
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

const INK = "rgba(255,255,255,0.92)";

const INK_2 = "rgba(255,255,255,0.6)";

const INK_3 = "rgba(255,255,255,0.38)";

const LINE_2 = "rgba(255,255,255,0.14)";

const WARN = "#ff8a7a";

const MORPH = "cubic-bezier(0.16, 1, 0.3, 1)";

const HEX = /^#[0-9a-fA-F]{6}$/;

export const DP_ACCENTS = {
  ice: "#4fd1ff",
  mint: "#5ef2c1",
  amber: "#ffb45e",
  white: "#f2f4f7",
} as const;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** A named accent or a #rrggbb hex; anything else falls back to ice. */
function accentHex(value: string): string {
  if (own(DP_ACCENTS, value)) return DP_ACCENTS[value];
  return HEX.test(value) ? value : DP_ACCENTS.ice;
}

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
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
const MOTION_CSS = "@media (prefers-reduced-motion: reduce){.dp-motion{animation:none!important}}";

// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".dp-scope :focus-visible,.dp-scope:focus-visible{outline:2px solid var(--dp-accent);outline-offset:3px;border-radius:revert-layer}";

const LOG_CSS = "@keyframes dp-progress{from{transform:translateX(-100%)}to{transform:translateX(300%)}}@keyframes dp-spin{to{transform:rotate(360deg)}}";

/** The accent as the CSS variables the focus ring and the keyframes read. */
function accentVars(hex: string): CSSProperties {
  const [r, g, b] = rgbOf(hex);
  return { "--dp-accent": hex, "--dp-accent-rgb": `${r} ${g} ${b}` } as CSSProperties;
}

export type DeployLogInputProps = {
  label?: string;
  placeholder?: string;
  button?: string;
  steps?: string[];
  /** Shown when done; "{email}" is replaced with the address. */
  done?: string;
  note?: string;
  /**
   * Called with the address; it resolves the last step, so wire it to your real endpoint.
   * Reject with an Error whose message is safe to show: it is displayed as is.
   */
  onSubmit: (email: string) => Promise<void> | void;
  accent?: string;
  /** Milliseconds between log lines. */
  stepMs?: number;
};

/**
 * An email field that, on submit, streams a short log under itself while a
 * beam of light runs along its top edge, then confirms. The last line waits
 * for onSubmit, so the log never claims success before the work is done.
 */
export function DeployLogInput({
  label = "Work email",
  placeholder = "you@company.com",
  button = "Get an API key",
  steps = ["Checking the address", "Reserving a workspace", "Sending your key by email"],
  done = "You're in. Check {email}.",
  note,
  onSubmit,
  accent = "ice",
  stepMs = 850,
}: DeployLogInputProps) {
  const acc = accentHex(accent);
  const reduced = useReducedMotion();
  const uid = useId();
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "invalid" | "running" | "failed" | "done">("idle");
  const [shown, setShown] = useState(0);
  const [error, setError] = useState("");
  const [logH, setLogH] = useState(0);
  const run = useRef(0);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLogH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase === "running" || phase === "done") return;
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(value)) {
      setPhase("invalid");
      return;
    }
    const me = ++run.current;
    setPhase("running");
    setError("");
    setShown(1);
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, reduced ? 0 : ms));
    const job = Promise.resolve().then(() => onSubmit(value));
    job.catch(() => undefined);
    for (let i = 2; i <= steps.length; i++) {
      await wait(stepMs);
      if (run.current !== me) return;
      setShown(i);
    }
    try {
      await job;
    } catch (err) {
      if (run.current !== me) return;
      setError(err instanceof Error && err.message ? err.message : "That didn't go through. Try again in a moment.");
      setPhase("failed");
      return;
    }
    await wait(stepMs * 0.6);
    if (run.current !== me) return;
    setShown(steps.length + 1);
    setPhase("done");
  }

  const busy = phase === "running";
  const bad = phase === "invalid" || phase === "failed";
  const hintId = uid + "-hint";
  return (
    <form onSubmit={submit} noValidate className="dp-scope w-full max-w-[520px] text-left" style={{ ...accentVars(acc), fontFamily: SANS }}>
      <style>{FOCUS_CSS + LOG_CSS + MOTION_CSS}</style>
      <label htmlFor={uid} className="sr-only">
        {label}
      </label>
      <div
        className="relative flex items-center gap-2 overflow-hidden rounded-[14px] p-1.5"
        style={{
          background: "rgba(11,11,13,0.8)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: `inset 0 0 0 1px ${bad ? rgba(WARN, 0.6) : busy || phase === "done" ? rgba(acc, 0.45) : LINE_2}`,
          transition: "box-shadow 280ms ease",
        }}
      >
        {busy && !reduced && (
          <span aria-hidden className="dp-motion pointer-events-none absolute left-0 top-0 h-px w-1/3" style={{ background: `linear-gradient(90deg, transparent, ${acc}, #ffffff, ${acc}, transparent)`, animation: "dp-progress 2200ms linear infinite" }} />
        )}
        <input
          id={uid}
          type="email"
          maxLength={254}
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          placeholder={placeholder}
          disabled={busy || phase === "done"}
          aria-invalid={bad}
          aria-describedby={hintId}
          onChange={(e) => {
            setEmail(e.target.value);
            if (bad) setPhase("idle");
          }}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-[15px] placeholder:text-white/30 disabled:opacity-60"
          style={{ color: INK, outline: "none" }}
        />
        <button
          type="submit"
          disabled={busy || phase === "done"}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[10px] px-4 text-[14px] font-medium transition-opacity disabled:cursor-default"
          style={{ background: "#ffffff", color: "#050505", opacity: busy ? 0.7 : 1 }}
        >
          {phase === "done" ? "Sent" : busy ? "Working" : button}
        </button>
      </div>
      <div className="overflow-hidden" style={{ height: shown > 0 ? logH : 0, transition: reduced ? "none" : `height 420ms ${MORPH}` }}>
        <ol ref={logRef} role="log" aria-live="polite" className="space-y-1 px-2 pt-4 text-[13px]" style={{ fontFamily: MONO, color: INK_2 }}>
          {steps.slice(0, Math.min(shown, steps.length)).map((s, i) => {
            const complete = i < shown - 1 || phase === "done";
            const failedHere = phase === "failed" && i === shown - 1;
            return (
              <li key={s} className="flex items-center gap-2.5">
                <span aria-hidden className="flex h-4 w-4 items-center justify-center">
                  {complete ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7.5l2.5 2.5L11 4" stroke={acc} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : failedHere ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M4 4l6 6M10 4l-6 6" stroke={WARN} strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <span className="dp-motion h-3 w-3 rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${LINE_2}`, borderTop: `1.5px solid ${acc}`, animation: "dp-spin 900ms linear infinite" }} />
                  )}
                </span>
                <span style={{ color: complete ? INK_2 : INK }}>{s}</span>
              </li>
            );
          })}
          {phase === "done" && (
            <li className="pt-2 text-[14px]" style={{ fontFamily: SANS, color: INK }}>
              {done.replace("{email}", email.trim())}
            </li>
          )}
        </ol>
      </div>
      <p id={hintId} className="mt-3 px-2 text-[13px]" style={{ color: bad ? WARN : INK_3 }}>
        {phase === "invalid" ? "Enter a work email, like you@company.com." : phase === "failed" ? error : note ?? ""}
      </p>
    </form>
  );
}
