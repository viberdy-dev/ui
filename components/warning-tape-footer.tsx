"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

/**
 * WarningTapeFooter — a neo-brutalist footer under a strip of hazard tape
 * you can grab, with a wordmark whose letters are keys.
 *
 * - THE TAPE runs across the top of the footer at a slight tilt, wider than
 *   the page: short phrases in heavy caps between blocks of 45-degree hazard
 *   stripes. It crawls on one slow loop (48 seconds by default, never under
 *   30). Grab it and it lifts onto a longer shadow; drag to scrub it, let go
 *   and it keeps your throw, slows under friction, then settles back into
 *   its crawl. It stops while you point at it or while it has keyboard focus,
 *   and then the arrow keys nudge it (Shift for a bigger nudge). Under
 *   reduced motion it stands still unless you drag it.
 * - THE SIGN-UP is a real form that posts and reports through a status line.
 *   When it succeeds, a label is stamped onto the tape above the form (a hard
 *   two-frame cut, no fade) and crawls away with the tape. It comes back
 *   around every loop: it is printed on the tape now.
 * - THE WORDMARK is the brand set huge and cropped by the footer's bottom
 *   edge, one key per letter. Each letter sits on its own ink plate; point at
 *   one (or tap it) and it presses down onto the plate in 100ms linear. Only
 *   the letter moves, so the shadow never interpolates. Typing a letter of
 *   the brand on the keyboard presses it too, while the footer is on screen
 *   and no field has focus.
 *
 * Link columns are split by 3px rules; a bottom bar holds the year, an
 * optional status and social links. Type reads var(--font-display),
 * var(--font-sans) and var(--font-mono), so a buyer's next/font variables
 * drop in. One accent: the tape, the brand square, the focused field and a
 * pressed letter all share it.
 *
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries plugin).
 * No dependencies beyond React.
 */

const DISPLAY = 'var(--font-display, "Archivo", "Archivo Black", "Arial Black", "Helvetica Neue", Arial, sans-serif)';
const SANS = 'var(--font-sans, "Geist", "Inter", "Helvetica Neue", Arial, sans-serif)';
const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';
const HEX = /^#[0-9a-fA-F]{6}$/;
/** Friction: seconds for a throw to lose about two thirds of its speed on its way back to the crawl. */
const TAU = 0.45;
/** The ink plate under each wordmark letter, on the kit's 8px ladder step. */
const PLATE = 8;
/** A space that survives inside an inline-block letter. */
const NBSP = String.fromCharCode(160);

const FILLS = {
  yellow: "#ffd23f",
  coral: "#ff6b6b",
  blue: "#74b9ff",
  lime: "#b4f462",
  pink: "#ff5fa2",
} as const;

// Static rules only: colours arrive through custom properties set inline.
const WTF_CSS =
  ".wtf-tape{box-shadow:5px 5px 0 0 var(--wtf-ink);cursor:grab;touch-action:pan-y}" +
  ".wtf-tape[data-grab]{cursor:grabbing;transform:translate(-2px,-2px);box-shadow:7px 7px 0 0 var(--wtf-ink)}" +
  ".wtf-stamp{position:absolute;top:50%;display:flex;align-items:center;height:38px;padding:0 14px;white-space:nowrap;" +
  "transform:translate(-50%,-50%) rotate(-4deg);background:var(--wtf-ground);color:var(--wtf-ink);border:3px solid var(--wtf-ink);" +
  "box-shadow:5px 5px 0 0 var(--wtf-ink);font-size:20px;line-height:1;text-transform:uppercase;letter-spacing:-0.01em}" +
  "@keyframes wtf-slam{from{transform:translate(-50%,-50%) rotate(-4deg) scale(1.3);box-shadow:0 0 0 0 var(--wtf-ink)}" +
  "to{transform:translate(-50%,-50%) rotate(-4deg);box-shadow:5px 5px 0 0 var(--wtf-ink)}}" +
  "@media (prefers-reduced-motion:no-preference){.wtf-stamp{animation:wtf-slam 120ms steps(1,end) both}}" +
  ".wtf-word{font-kerning:none}" +
  ".wtf-plate,.wtf-face{display:inline-block;-webkit-text-stroke:6px var(--wtf-ink);paint-order:stroke fill}" +
  ".wtf-plate{color:var(--wtf-ink)}" +
  ".wtf-key{display:inline-block}" +
  ".wtf-face{color:var(--wtf-ground);transition:transform 100ms linear}" +
  ".wtf-key[data-down] .wtf-face{transform:translate(" + PLATE + "px," + PLATE + "px);color:var(--wtf-fill)}" +
  "@media (prefers-reduced-motion:reduce){.wtf-face{transition:none}}";

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** Links: strip tabs and newlines, refuse backslashes, allow http(s), mailto, tel and same-site paths. */
function safeHref(raw: string) {
  const v = raw.replace(/[\t\n\r]/g, "").trim();
  if (!v || v.includes("\\")) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#?]/.test(v) && !/^\/\//.test(v)) return v;
  return "#";
}

function reduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True while focus is somewhere text can be typed. */
function isTyping(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return true;
  return t instanceof HTMLInputElement && !/^(button|checkbox|color|file|hidden|image|radio|range|reset|submit)$/i.test(t.type);
}

export type TapeLink = { label: string; href: string };
export type TapeColumn = { title: string; links: TapeLink[] };

export type WarningTapeFooterProps = {
  brand?: string;
  /** Where the brand links to. */
  home?: string;
  tagline?: string;
  /** The phrases on the tape. */
  tape?: string[];
  /** Seconds for one loop of the tape; clamped to 30 or more. */
  speed?: number;
  /** Tilt of the tape in degrees, -4 to 4. */
  tilt?: number;
  columns?: TapeColumn[];
  social?: TapeLink[];
  /** A short line in the bottom bar, e.g. a status. Empty hides it. */
  status?: string;
  /** The sign-up: called with the email once it is valid. Wire it to your real list provider (a stub loses the addresses). Omit to hide the form. */
  onSubscribe?: (email: string) => void | Promise<void>;
  subscribeLabel?: string;
  /** Stamped onto the tape when a sign-up succeeds. Keep it short. Empty turns the stamp off. */
  stamp?: string;
  /** The brand name as a giant wordmark cropped by the bottom edge, one key per letter. */
  wordmark?: boolean;
  /** Typing a letter of the brand presses it on the wordmark (only while the footer is on screen and no field has focus). */
  keys?: boolean;
  /** Shown in the bottom bar; pass it from the server so it never goes stale. */
  year?: number;
  accent?: keyof typeof FILLS | string;
  ink?: string;
  ground?: "cream" | "white";
  className?: string;
};

/**
 * PLACEHOLDER defaults (brand, tagline, tape, columns, social) for "Hod", the
 * kit's fictional branch-preview tool. Every link points at "#": pass your own.
 */
const DEFAULT_COLUMNS: TapeColumn[] = [
  { title: "Product", links: [{ label: "Previews", href: "#" }, { label: "Comments", href: "#" }, { label: "Checks", href: "#" }, { label: "Pricing", href: "#" }] },
  { title: "Docs", links: [{ label: "Quickstart", href: "#" }, { label: "Frameworks", href: "#" }, { label: "CLI", href: "#" }, { label: "API", href: "#" }] },
  { title: "Company", links: [{ label: "About", href: "#" }, { label: "Changelog", href: "#" }, { label: "Careers", href: "#" }, { label: "Contact", href: "#" }] },
];

const DEFAULT_SOCIAL: TapeLink[] = [
  { label: "GitHub", href: "#" },
  { label: "Discord", href: "#" },
  { label: "RSS", href: "#" },
];

function Stripes({ ink, fill }: { ink: string; fill: string }) {
  return (
    <span
      aria-hidden
      className="block h-full w-[84px] shrink-0"
      style={{
        background: "repeating-linear-gradient(135deg, " + ink + " 0 12px, " + fill + " 12px 24px)",
        borderLeft: "3px solid " + ink,
        borderRight: "3px solid " + ink,
      }}
    />
  );
}

type Phys = {
  /** The track's offset along the tape, px (kept within one run). */
  x: number;
  /** Velocity, px per second. */
  v: number;
  /** The width of one run of phrases, px. */
  w: number;
  drag: boolean;
  hover: boolean;
  focus: boolean;
  from: number;
  x0: number;
  trail: { a: number; t: number }[];
  draw: () => void;
  kick: () => void;
};

export function WarningTapeFooter({
  brand = "hod",
  home = "/",
  tagline = "Previews for every pull request. Built by a small team that ships its own drafts first.",
  tape = ["Ship the rough draft", "Preview every push", "Mind the merge"],
  speed = 48,
  tilt = -2,
  columns = DEFAULT_COLUMNS,
  social = DEFAULT_SOCIAL,
  status = "",
  onSubscribe,
  subscribeLabel = "Get the changelog",
  stamp = "You're in",
  wordmark = true,
  keys = true,
  year,
  accent = "yellow",
  ink = "#000000",
  ground = "cream",
  className = "",
}: WarningTapeFooterProps) {
  const line = HEX.test(ink) ? ink : "#000000";
  const hi = own(FILLS, accent) ? FILLS[accent] : HEX.test(accent) ? accent : FILLS.yellow;
  const bg = ground === "white" ? "#ffffff" : "#fffdf5";
  const secs = Math.max(30, Number.isFinite(speed) ? speed : 48);
  const angle = Math.max(-4, Math.min(4, Number.isFinite(tilt) ? tilt : -2));
  const rule = "3px solid " + line;
  const [sub, setSub] = useState<"idle" | "busy" | "done" | "fail">("idle");
  const [pressed, setPressed] = useState(false);
  const [stampAt, setStampAt] = useState<number | null>(null);
  const uid = useId();
  const rootRef = useRef<HTMLElement>(null);
  const tapeRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const markRef = useRef<HTMLParagraphElement>(null);
  const secsRef = useRef(secs);
  const phys = useRef<Phys>({ x: 0, v: 0, w: 0, drag: false, hover: false, focus: false, from: 0, x0: 0, trail: [], draw: () => {}, kick: () => {} });

  const phrases = tape.length ? tape : ["Ship the rough draft"];
  const letters = Array.from(brand);

  useEffect(() => {
    secsRef.current = secs;
    phys.current.kick();
  }, [secs]);

  // The tape's physics: one loop, running only while the tape is on screen
  // and something is moving. Velocity eases toward a target (the crawl, or
  // zero while held, pointed at or focused) with time constant TAU: that one
  // rule is the throw's momentum, its friction and the return to the crawl.
  useEffect(() => {
    const tapeEl = tapeRef.current;
    const track = trackRef.current;
    if (!tapeEl || !track) return;
    const p = phys.current;
    const still = reduced();
    let raf = 0;
    let last = 0;
    let seen = false;
    const measure = () => {
      const run = track.firstElementChild as HTMLElement | null;
      p.w = run ? run.offsetWidth : 0;
    };
    p.draw = () => {
      if (p.w > 0) {
        while (p.x <= -p.w) p.x += p.w;
        while (p.x > 0) p.x -= p.w;
      }
      track.style.transform = "translate3d(" + p.x.toFixed(2) + "px,0,0)";
    };
    const target = () => (still || p.hover || p.focus || p.drag ? 0 : -p.w / Math.max(30, secsRef.current));
    const frame = (t: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      if (p.drag) {
        last = 0;
        return;
      }
      const vt = target();
      p.v += (vt - p.v) * (1 - Math.exp(-dt / TAU));
      p.x += p.v * dt;
      p.draw();
      // Idle: nothing to crawl toward and the throw has died, so stop asking for frames.
      if (vt === 0 && Math.abs(p.v) < 1) {
        p.v = 0;
        last = 0;
        return;
      }
      if (seen) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    p.kick = () => {
      if (!raf && seen && !p.drag) raf = requestAnimationFrame(frame);
    };
    const ro = new ResizeObserver(() => {
      measure();
      p.draw();
    });
    ro.observe(track);
    const io = new IntersectionObserver((es) => {
      seen = es[es.length - 1].isIntersecting;
      if (seen) p.kick();
    });
    io.observe(tapeEl);
    measure();
    p.draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      p.kick = () => {};
    };
  }, []);

  // The wordmark's letters answer the keyboard too.
  const brandKey = brand;
  useEffect(() => {
    const mark = markRef.current;
    if (!mark || !keys) return;
    let seen = false;
    const io = new IntersectionObserver((es) => {
      seen = es[es.length - 1].isIntersecting;
    });
    io.observe(mark);
    const since = new Map<string, number>();
    const timers = new Map<string, number>();
    const hits = (k: string) => Array.from(mark.querySelectorAll<HTMLElement>(".wtf-key")).filter((el) => el.getAttribute("data-ch") === k);
    const onDown = (e: KeyboardEvent) => {
      if (!seen || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || isTyping(e.target) || isTyping(document.activeElement)) return;
      const k = e.key.toLowerCase();
      if (k.length !== 1 || k === " ") return;
      const els = hits(k);
      if (!els.length) return;
      window.clearTimeout(timers.get(k));
      since.set(k, e.timeStamp);
      els.forEach((el) => el.setAttribute("data-down", ""));
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const t0 = since.get(k);
      if (t0 === undefined) return;
      since.delete(k);
      // Hold long enough for the 100ms press to land, even on a quick tap.
      timers.set(k, window.setTimeout(() => hits(k).forEach((el) => el.removeAttribute("data-down")), Math.max(0, 120 - (e.timeStamp - t0))));
    };
    const clear = () => {
      timers.forEach((t) => window.clearTimeout(t));
      since.clear();
      mark.querySelectorAll<HTMLElement>(".wtf-key[data-down]").forEach((el) => el.removeAttribute("data-down"));
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      io.disconnect();
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, [keys, wordmark, brandKey]);

  /** The pointer's position along the tape's tilted axis, in the footer's layout pixels. */
  function along(e: { clientX: number; clientY: number }) {
    const root = rootRef.current;
    const k = root ? root.offsetWidth / (root.getBoundingClientRect().width || 1) : 1;
    const rad = (angle * Math.PI) / 180;
    return (e.clientX * Math.cos(rad) + e.clientY * Math.sin(rad)) * k;
  }

  function onGrab(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const p = phys.current;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // A pointer that already ended cannot be captured; the drag still works.
    }
    const a = along(e);
    p.drag = true;
    p.v = 0;
    p.from = a;
    p.x0 = p.x;
    p.trail = [{ a, t: e.timeStamp }];
    e.currentTarget.setAttribute("data-grab", "");
  }
  function onDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const p = phys.current;
    if (!p.drag) return;
    const a = along(e);
    p.x = p.x0 + (a - p.from);
    p.trail.push({ a, t: e.timeStamp });
    p.trail = p.trail.filter((s) => e.timeStamp - s.t < 100);
    p.draw();
  }
  function onDrop(e: ReactPointerEvent<HTMLDivElement>) {
    const p = phys.current;
    if (!p.drag) return;
    p.drag = false;
    // A throw is physical: it glides and rejoins the crawl even under the
    // pointer. Resting the pointer on the tape again (a fresh entry) stops it.
    p.hover = false;
    e.currentTarget.removeAttribute("data-grab");
    const first = p.trail[0];
    const dt = first ? (e.timeStamp - first.t) / 1000 : 0;
    // Keep the throw: the speed of the last 100ms of the drag.
    p.v = !reduced() && first && dt > 0.008 ? Math.max(-4000, Math.min(4000, (along(e) - first.a) / dt)) : 0;
    p.kick();
  }
  function onNudge(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const p = phys.current;
    const dir = e.key === "ArrowLeft" ? -1 : 1;
    const big = e.shiftKey ? 2.5 : 1;
    if (reduced()) {
      p.x += dir * 64 * big;
      p.draw();
      return;
    }
    p.v = Math.max(-3000, Math.min(3000, p.v + dir * 700 * big));
    p.kick();
  }

  /** Where the stamp lands: on the tape, straight above the form, in one run's coordinates. */
  function placeStamp() {
    const p = phys.current;
    const root = rootRef.current;
    const tapeEl = tapeRef.current;
    const form = formRef.current;
    if (!stamp || !root || !tapeEl || !form || p.w <= 0) return;
    const k = root.offsetWidth / (root.getBoundingClientRect().width || 1);
    const t = tapeEl.getBoundingClientRect();
    const f = form.getBoundingClientRect();
    const onTape = (f.left + f.width / 2 - t.left) * k;
    const inRun = (((onTape - p.x) % p.w) + p.w) % p.w;
    // Keep it clear of the run's seam so the copy in each run lines up.
    setStampAt(Math.max(130, Math.min(p.w - 130, inRun)));
  }

  const run = (copy: number) => (
    <div aria-hidden className="relative flex h-full shrink-0 items-stretch" key={copy}>
      {phrases.map((ph, i) => (
        <span key={i} className="flex h-full items-stretch">
          <span className="flex items-center whitespace-nowrap px-7 text-[22px] uppercase leading-none tracking-[-0.01em]" style={{ fontFamily: DISPLAY, fontWeight: 900 }}>
            {ph}
          </span>
          <Stripes ink={line} fill={hi} />
        </span>
      ))}
      {stampAt !== null && stamp && (
        <span className="wtf-stamp" style={{ left: stampAt, fontFamily: DISPLAY, fontWeight: 900 }}>
          {stamp}
        </span>
      )}
    </div>
  );

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sub === "busy" || sub === "done" || !onSubscribe) return;
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setSub("busy");
    try {
      await onSubscribe(email);
      setSub("done");
      placeStamp();
    } catch {
      setSub("fail");
    }
  };

  const press = (el: HTMLElement) => el.setAttribute("data-down", "");
  const lift = (el: HTMLElement) => el.removeAttribute("data-down");

  const linkCls =
    "underline-offset-[5px] hover:underline hover:decoration-[3px] focus-visible:![outline-style:dashed] focus-visible:![outline-width:3px] focus-visible:![outline-offset:3px] focus-visible:![border-radius:0]";

  return (
    <footer
      ref={rootRef}
      className={"@container relative w-full overflow-hidden " + className}
      style={{ "--wtf-ink": line, "--wtf-fill": hi, "--wtf-ground": bg, background: bg, color: line } as CSSProperties}
    >
      <style>{WTF_CSS}</style>

      {/* The tape: wider than the page, tilted, crawling; grab it and throw it. */}
      <div className="relative z-10 -mx-[4%] pt-10 pb-12" style={{ transform: "rotate(" + angle + "deg)" }}>
        <div
          ref={tapeRef}
          role="marquee"
          tabIndex={0}
          aria-label={phrases.join(". ")}
          aria-describedby={uid + "-tape"}
          onPointerDown={onGrab}
          onPointerMove={onDrag}
          onPointerUp={onDrop}
          onPointerCancel={onDrop}
          onPointerEnter={(e) => {
            if (e.pointerType !== "mouse") return;
            phys.current.hover = true;
            phys.current.kick();
          }}
          onPointerLeave={(e) => {
            if (e.pointerType !== "mouse") return;
            phys.current.hover = false;
            phys.current.kick();
          }}
          onFocus={(e) => {
            // Keyboard focus stops the crawl; the focus a grab leaves behind does not.
            phys.current.focus = e.currentTarget.matches(":focus-visible");
            phys.current.kick();
          }}
          onBlur={() => {
            phys.current.focus = false;
            phys.current.kick();
          }}
          onKeyDown={onNudge}
          className="wtf-tape h-[60px] select-none overflow-hidden focus-visible:![outline-style:dashed] focus-visible:![outline-width:3px] focus-visible:![outline-offset:4px] focus-visible:![border-radius:0]"
          style={{ background: hi, borderTop: rule, borderBottom: rule, outlineColor: line }}
        >
          <div ref={trackRef} className="flex h-full w-max will-change-transform">
            {run(0)}
            {run(1)}
          </div>
        </div>
        <span id={uid + "-tape"} className="sr-only">
          Drag the tape, or use the arrow keys, to move it. It stops while it has focus.
        </span>
      </div>

      <div className="mx-auto max-w-[1200px] px-6 @3xl:px-10 @6xl:px-14">
        <div className="grid @4xl:grid-cols-[1.25fr_2fr]" style={{ borderTop: rule, borderBottom: rule }}>
          <div className="flex flex-col gap-5 py-9 @4xl:pr-10" style={{ borderBottom: rule }}>
            <a href={safeHref(home)} className={"inline-flex w-fit items-center gap-2.5 text-[34px] leading-none tracking-[-0.03em] " + linkCls} style={{ fontFamily: DISPLAY, fontWeight: 900, outlineColor: line }}>
              <span aria-hidden className="size-6" style={{ background: hi, border: rule }} />
              {brand}
            </a>
            {tagline && (
              <p className="max-w-[26rem] text-[16px] leading-[1.5]" style={{ fontFamily: SANS, opacity: 0.84 }}>
                {tagline}
              </p>
            )}
            {onSubscribe && (
              <form ref={formRef} method="post" onSubmit={submit} className="mt-1 flex max-w-[26rem] flex-col gap-2.5">
                <label htmlFor={uid + "-email"} className="text-[12px] uppercase tracking-[0.08em]" style={{ fontFamily: MONO, fontWeight: 700 }}>
                  {subscribeLabel}
                </label>
                <div className="flex">
                  <input
                    id={uid + "-email"}
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    placeholder="you@company.com"
                    readOnly={sub === "busy" || sub === "done"}
                    className="h-12 min-w-0 flex-1 bg-white px-3.5 text-[15px] outline-none placeholder:opacity-45 focus:bg-[var(--wtf-fill)] focus-visible:![outline:none]"
                    style={{ border: rule, borderRight: 0, fontFamily: SANS, color: line }}
                  />
                  <button
                    type="submit"
                    aria-disabled={sub === "busy" || sub === "done" || undefined}
                    onPointerDown={(e) => {
                      if (e.button === 0) setPressed(true);
                    }}
                    onPointerUp={() => setPressed(false)}
                    onPointerLeave={() => setPressed(false)}
                    className={
                      "h-12 shrink-0 px-5 text-[14px] uppercase tracking-[0.04em] transition-[transform,translate,box-shadow] duration-100 ease-linear motion-reduce:transition-none " +
                      "focus-visible:![outline-style:dashed] focus-visible:![outline-width:3px] focus-visible:![outline-offset:4px] focus-visible:![border-radius:0] " +
                      (pressed ? "translate-x-[5px] translate-y-[5px] shadow-none" : "shadow-[5px_5px_0_0_var(--wtf-ink)]")
                    }
                    style={{ background: line, color: bg, border: rule, outlineColor: line, fontFamily: DISPLAY, fontWeight: 800 }}
                  >
                    {sub === "busy" ? "Sending…" : sub === "done" ? "Done" : "Subscribe"}
                  </button>
                </div>
                <p role="status" className="min-h-[18px] text-[12px] uppercase tracking-[0.06em]" style={{ fontFamily: MONO }}>
                  {sub === "done" ? "You're on the list." : sub === "fail" ? "Didn't send. Try again." : ""}
                </p>
              </form>
            )}
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 @2xl:grid-cols-3 @4xl:![border-left:3px_solid_var(--wtf-ink)]">
            {columns.map((c, i) => (
              <div
                key={c.title}
                className={"flex flex-col gap-3 px-0 py-9 @2xl:px-7 " + (i > 0 ? "@2xl:![border-left:3px_solid_var(--wtf-ink)]" : "")}
              >
                <p className="text-[12px] uppercase tracking-[0.08em]" style={{ fontFamily: MONO, fontWeight: 700, opacity: 0.7 }}>
                  {c.title}
                </p>
                <ul className="flex flex-col gap-2">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <a href={safeHref(l.href)} className={"text-[18px] leading-[1.3] tracking-[-0.01em] " + linkCls} style={{ fontFamily: DISPLAY, fontWeight: 800, outlineColor: line }}>
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-5 text-[12.5px] uppercase tracking-[0.08em]" style={{ fontFamily: MONO }}>
          <span>{"© " + (year ? year + " " : "") + brand}</span>
          {status && (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="size-2.5" style={{ background: line }} />
              {status}
            </span>
          )}
          <ul className="flex gap-6">
            {social.map((s) => (
              <li key={s.label}>
                <a href={safeHref(s.href)} className={linkCls} style={{ outlineColor: line }}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* The wordmark: one key per letter, each over its own fixed ink plate. */}
      {wordmark && (
        <p
          ref={markRef}
          aria-hidden
          className="wtf-word relative -mb-[0.2em] select-none whitespace-nowrap px-4 text-center text-[31cqw] leading-[0.8] tracking-[-0.06em]"
          style={{ fontFamily: DISPLAY, fontWeight: 900 }}
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 px-4" style={{ transform: "translate(" + PLATE + "px," + PLATE + "px)" }}>
            {letters.map((ch, i) => (
              <span key={i} className="wtf-plate">
                {ch === " " ? NBSP : ch}
              </span>
            ))}
          </span>
          <span className="relative">
            {letters.map((ch, i) => (
              <span
                key={i}
                className="wtf-key"
                data-ch={ch.toLowerCase()}
                onPointerEnter={(e) => {
                  if (e.pointerType !== "touch") press(e.currentTarget);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType !== "touch") lift(e.currentTarget);
                }}
                onPointerDown={(e) => {
                  if (e.pointerType === "touch") press(e.currentTarget);
                }}
                onPointerUp={(e) => {
                  if (e.pointerType !== "touch") return;
                  const el = e.currentTarget;
                  window.setTimeout(() => lift(el), 140);
                }}
                onPointerCancel={(e) => lift(e.currentTarget)}
              >
                <span className="wtf-face">{ch === " " ? NBSP : ch}</span>
              </span>
            ))}
          </span>
        </p>
      )}
    </footer>
  );
}
