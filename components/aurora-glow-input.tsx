"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

/**
 * AuroraGlowInput — a waitlist field that lights like the sky.
 *
 * A hairline pill at rest; focus raises a soft two-hue bloom (320ms) and
 * lights the rim, and every keystroke sends a small rose ripple from the
 * caret (260ms). The address goes to `onJoin`, which is required: the field
 * never claims a sign-up on its own. On success the whole palette sweeps
 * once through the bloom (a 600ms borealis flash).
 *
 * Part of the Aurora kit: a near-black night (#050608) lit by curtains of
 * aurora in mint #7cf5c4 and sky #38bdf8, a violet #a78bfa blend, a rose
 * #f472b6 crown and an indigo #5b6cc4 fringe, all on one 60s clock; Bricolage
 * Grotesque through var(--font-bricolage) for lit display type over Geist.
 * Respects prefers-reduced-motion. No dependencies beyond React. Paste it as
 * its own file: it repeats the kit's small helpers, which would clash in one
 * module. For the display face, load Bricolage Grotesque with next/font
 * (variable: "--font-bricolage") on a parent; elsewhere, load it with a
 * Google Fonts link or @fontsource and set --font-bricolage yourself.
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries plugin).
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The night the kit is set in. */
const SKY = {
  ground: "#050608",
  panel: "#0a0d12",
  raised: "#0f141a",
  ink: "rgba(236,244,248,0.94)",
  ink2: "rgba(236,244,248,0.64)",
  ink3: "rgba(236,244,248,0.42)",
  line: "rgba(236,244,248,0.08)",
  line2: "rgba(236,244,248,0.16)",
  shadow: "0 40px 100px -30px rgba(0,0,0,0.7)",
} as const;

/**
 * The sky's colours by altitude: the core low in the curtain (two hues it
 * drifts between on the aurora clock), a violet blend above it, a rose crown
 * seen only in a strong display, and an indigo fringe under the lower border.
 */
export type AuPalette = { core: string; core2: string; blend: string; high: string; fringe: string };

export const AU_PALETTES = {
  boreal: { core: "#7cf5c4", core2: "#38bdf8", blend: "#a78bfa", high: "#f472b6", fringe: "#5b6cc4" },
  verdant: { core: "#6ee7a0", core2: "#7cf5c4", blend: "#8fb4f0", high: "#e879b9", fringe: "#5b6cc4" },
  violet: { core: "#a78bfa", core2: "#38bdf8", blend: "#c4a6fb", high: "#f472b6", fringe: "#4c5bb8" },
} as const satisfies Record<string, AuPalette>;

export type AuPaletteName = keyof typeof AU_PALETTES;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** A named palette, or boreal. */
function paletteOf(name: string): AuPalette {
  return own(AU_PALETTES, name) ? AU_PALETTES[name] : AU_PALETTES.boreal;
}

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt((HEX.test(hex) ? hex : "#7cf5c4").slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * The aurora clock: every lit part of the page reads one 60s cycle, so a
 * button, a rim and the sky drift together instead of breathing out of step.
 * The phase is the page's own timeline (performance.now), shared by
 * everything on it.
 */
const CLOCK_S = 60;

/**
 * A ref callback that starts an element's CSS animation where the clock
 * already is, so parts that mount at different moments stay in step.
 */
function syncClock(periodS: number) {
  return (el: HTMLElement | null) => {
    if (el) el.style.animationDelay = `${(-(performance.now() / 1000) % periodS).toFixed(3)}s`;
  };
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
// Nothing is interpolated into these sheets; colours arrive as CSS variables.
// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".au-scope :focus-visible,.au-scope:focus-visible{outline:2px solid var(--au-ring,#7cf5c4);outline-offset:3px;border-radius:revert-layer}";

/** The palette as CSS variables, for the parts drawn in CSS. */
function paletteVars(p: AuPalette): CSSProperties {
  return { "--au-core": p.core, "--au-core2": p.core2, "--au-blend": p.blend, "--au-high": p.high, "--au-ring": p.core } as CSSProperties;
}

// A registered angle, so the under-glow turns on the compositor without a render per frame.
const GLOW_BTN_CSS =
  "@property --au-a{syntax:'<angle>';inherits:false;initial-value:0deg}" +
  "@keyframes au-turn{to{--au-a:360deg}}" +
  "@keyframes au-ring{from{opacity:.9;transform:scale(1)}to{opacity:0;transform:scale(1.18,1.5)}}" +
  ".au-glow{inset:-6px -8px -12px;opacity:.55;animation:au-turn 60s linear infinite}" +
  ".au-btn:hover .au-glow,.au-btn:focus-visible .au-glow{inset:-12px -14px -18px;opacity:.85}" +
  ".au-q .au-glow{opacity:0}.au-q:hover .au-glow,.au-q:focus-visible .au-glow{opacity:.4}" +
  ".au-btn:active{transform:translateY(1px) scale(.985)}" +
  "@media (prefers-reduced-motion: reduce){.au-glow{animation:none}.au-ring{animation:none!important;opacity:0}}";

export type AuroraGlowButtonProps = {
  children: ReactNode;
  /** Renders a link when given, else a button. */
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  /** "solid" carries the sky under it; "quiet" is a hairline pill whose light wakes on hover. */
  variant?: "solid" | "quiet";
  size?: "md" | "lg";
  palette?: AuPaletteName;
  disabled?: boolean;
  className?: string;
};

/**
 * A pill with a sliver of the sky under it. The under-glow is a slow turn
 * through the palette on the page's 60s aurora clock, so every button on the
 * page glows in step with the sky; hover or focus lets it spread (220ms), and
 * a press (or Enter or Space) sends a ring of light out from the pill (380ms). The top edge
 * carries a thin lit rim. Renders a link when given an href, else a button.
 */
export function AuroraGlowButton({ children, href, onClick, type = "button", variant = "solid", size = "md", palette = "boreal", disabled, className }: AuroraGlowButtonProps) {
  const p = paletteOf(palette);
  const [ring, setRing] = useState(0);
  const solid = variant === "solid";
  const cls =
    "au-scope au-btn relative isolate inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[transform,color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50 " +
    (size === "lg" ? "h-[52px] px-7 text-[15px]" : "h-11 px-5 text-[14px]") +
    (solid ? "" : " au-q") +
    (className ? " " + className : "");
  const style: CSSProperties = {
    ...paletteVars(p),
    color: SKY.ink,
    fontFamily: SANS,
    background: solid ? `linear-gradient(180deg, ${SKY.raised}, ${SKY.panel})` : "transparent",
    boxShadow: solid ? `inset 0 0 0 1px ${SKY.line2}, 0 10px 30px -12px rgba(0,0,0,0.8)` : `inset 0 0 0 1px ${SKY.line2}`,
  };
  const sheet = <style>{FOCUS_CSS + GLOW_BTN_CSS}</style>;
  const inner = (
    <>
      {/* The sky under the pill, turning on the aurora clock. */}
      <span
        ref={syncClock(CLOCK_S)}
        aria-hidden
        className="au-glow pointer-events-none absolute -z-10 rounded-full transition-[inset,opacity] duration-200"
        style={{
          background: "conic-gradient(from var(--au-a), var(--au-core), var(--au-core2), var(--au-blend), var(--au-core2), var(--au-core))",
          filter: "blur(14px)",
        }}
      />
      {/* A lit rim along the top edge. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          padding: 1,
          background: `linear-gradient(90deg, transparent 12%, ${rgba(p.core, solid ? 0.7 : 0.35)} 40%, ${rgba(p.core2, solid ? 0.6 : 0.3)} 62%, transparent 88%) top / 100% 1px no-repeat`,
        }}
      />
      {ring > 0 && (
        <span
          key={ring}
          aria-hidden
          className="au-ring pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 0 1px ${rgba(p.core, 0.8)}, 0 0 24px ${rgba(p.core2, 0.5)}`, animation: `au-ring 380ms ${EASE} both` }}
        />
      )}
      <span className="relative">{children}</span>
    </>
  );
  const onDown = () => {
    if (!disabled) setRing((r) => r + 1);
  };
  const onKey = (e: ReactKeyboardEvent) => {
    if (!e.repeat && (e.key === "Enter" || e.key === " ")) onDown();
  };
  if (href !== undefined) {
    return (
      <>
        {sheet}
        <a href={safeHref(href)} onClick={onClick} onPointerDown={onDown} onKeyDown={onKey} className={cls} style={style}>
          {inner}
        </a>
      </>
    );
  }
  return (
    <>
      {sheet}
      <button type={type} onClick={onClick} onPointerDown={onDown} onKeyDown={onKey} disabled={disabled} className={cls} style={style}>
        {inner}
      </button>
    </>
  );
}

const INPUT_CSS =
  ".au-field .au-bloom{opacity:0;transition:opacity 320ms cubic-bezier(0.22,1,0.36,1)}" +
  ".au-field:focus-within .au-bloom{opacity:.55}" +
  ".au-field .au-lit{opacity:0;transition:opacity 320ms cubic-bezier(0.22,1,0.36,1)}" +
  ".au-field:focus-within .au-lit{opacity:1}" +
  ".au-field input:focus-visible{outline:none}" +
  "@media (prefers-reduced-motion: reduce){.au-field .au-bloom,.au-field .au-lit{transition:none}}";

export type AuroraGlowInputProps = {
  /** Called with the address. Resolve when it is received; throw to show `failed`. Required: the field never claims a sign-up on its own. */
  onJoin: (email: string) => Promise<void> | void;
  label?: string;
  placeholder?: string;
  cta?: string;
  done?: string;
  failed?: string;
  note?: string;
  palette?: AuPaletteName;
  className?: string;
};

/**
 * A waitlist field that lights like the sky. At rest it is a hairline pill;
 * focus raises a soft two-hue bloom around it (320ms) and lights its rim, and
 * every keystroke sends a small rose ripple out from the caret (260ms). The
 * address goes to `onJoin`, which is required; while it runs the button says
 * so, and when it resolves the whole palette sweeps once through the bloom
 * (a 600ms borealis flash) and the field settles into its thank-you.
 * A native email input with a label and a polite status line.
 */
export function AuroraGlowInput({
  onJoin,
  label = "Email address",
  placeholder = "you@company.com",
  cta = "Join the waitlist",
  done = "You are on the list. We will write before your first night.",
  failed = "That did not go through. Try again in a moment.",
  note,
  palette = "boreal",
  className,
}: AuroraGlowInputProps) {
  const p = paletteOf(palette);
  const reduced = useReducedMotion();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [hint, setHint] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);
  const bloomRef = useRef<HTMLSpanElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  // A ripple from the caret: measure the text before it in a hidden mirror of the field.
  const ripple = () => {
    const input = inputRef.current;
    const mirror = mirrorRef.current;
    const layer = rippleRef.current;
    if (!input || !mirror || !layer || reduced) return;
    mirror.textContent = input.value.slice(0, input.selectionStart ?? input.value.length) || "";
    const x = Math.min(input.clientWidth - 8, mirror.offsetWidth - input.scrollLeft) + 22;
    // Only numbers and the palette's own hex reach this style string; keep it that way if you extend it.
    const dot = document.createElement("span");
    dot.setAttribute("aria-hidden", "true");
    dot.style.cssText = `position:absolute;left:${x}px;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:999px;pointer-events:none;background:radial-gradient(closest-side, ${rgba(p.high, 0.55)}, ${rgba(p.high, 0)});`;
    layer.appendChild(dot);
    const a = dot.animate([{ transform: "scale(0.25)", opacity: 0.9 }, { transform: "scale(1.5)", opacity: 0 }], { duration: 260, easing: EASE });
    a.onfinish = () => dot.remove();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "sending" || state === "done") return;
    if (!inputRef.current?.checkValidity() || !email.trim()) {
      setHint("Enter an email address.");
      inputRef.current?.focus();
      return;
    }
    setHint("");
    setState("sending");
    try {
      await onJoin(email.trim());
      setState("done");
      // The borealis flash: the whole palette sweeps once through the bloom.
      const b = bloomRef.current;
      if (b && !reduced) {
        b.animate(
          [
            { opacity: 0.2, backgroundPosition: "0% 50%" },
            { opacity: 0.95, backgroundPosition: "100% 50%", offset: 0.55 },
            { opacity: 0.45, backgroundPosition: "200% 50%" },
          ],
          { duration: 600, easing: EASE },
        );
      }
    } catch {
      setState("error");
    }
  };

  const doneNow = state === "done";
  return (
    <form onSubmit={submit} noValidate className={"au-scope @container w-full" + (className ? " " + className : "")} style={{ ...paletteVars(p), color: SKY.ink, fontFamily: SANS }}>
      <style>{FOCUS_CSS + INPUT_CSS}</style>
      <label htmlFor={`${uid}-email`} className="sr-only">
        {label}
      </label>
      <div className="flex flex-col gap-3 @md:flex-row @md:items-center">
        <div className="au-field relative isolate h-[54px] min-w-0 flex-1 rounded-full">
          {/* The bloom behind the field; on success it carries the borealis flash. */}
          <span
            ref={bloomRef}
            aria-hidden
            className="au-bloom pointer-events-none absolute -inset-1 -z-10 rounded-full"
            style={{ background: `linear-gradient(90deg, ${p.core2}, ${p.core}, ${p.blend}, ${p.high}, ${p.core2}, ${p.core})`, backgroundSize: "200% 100%", filter: "blur(16px)" }}
          />
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full" style={{ background: SKY.panel, boxShadow: `inset 0 0 0 1px ${SKY.line2}` }} />
          {/* The lit rim on focus. */}
          <span
            aria-hidden
            className="au-lit pointer-events-none absolute inset-0 rounded-full"
            style={{
              padding: 1,
              background: `linear-gradient(90deg, ${p.core2}, ${p.core} 50%, ${p.blend})`,
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              maskComposite: "exclude",
            }}
          />
          <span ref={rippleRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" />
          {/* A hidden mirror of the text, to find the caret. */}
          <span ref={mirrorRef} aria-hidden className="invisible absolute left-0 top-0 whitespace-pre text-[15.5px]" />
          <input
            ref={inputRef}
            id={`${uid}-email`}
            type="email"
            required
            autoComplete="email"
            placeholder={placeholder}
            value={email}
            disabled={doneNow}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === "error") setState("idle");
              if (hint) setHint("");
            }}
            onKeyUp={(e: ReactKeyboardEvent<HTMLInputElement>) => {
              if (e.key.length === 1 || e.key === "Backspace") ripple();
            }}
            aria-describedby={`${uid}-msg`}
            aria-invalid={hint ? true : undefined}
            className="relative h-full w-full rounded-full bg-transparent px-[22px] text-[15.5px] placeholder:text-[rgba(236,244,248,0.38)] disabled:opacity-70"
            style={{ color: SKY.ink }}
          />
        </div>
        <AuroraGlowButton type="submit" size="lg" palette={palette} disabled={state === "sending" || doneNow}>
          {state === "sending" ? "Joining" : doneNow ? "Joined" : cta}
        </AuroraGlowButton>
      </div>
      <p id={`${uid}-msg`} role="status" aria-live="polite" className="m-0 mt-3 flex min-h-[20px] items-center gap-2 text-[13.5px]" style={{ color: state === "error" || hint ? "#f4a3b4" : doneNow ? SKY.ink : SKY.ink3 }}>
        {doneNow && <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: p.core, boxShadow: `0 0 10px ${p.core}` }} />}
        {state === "error" ? failed : doneNow ? done : hint || note || ""}
      </p>
    </form>
  );
}
