"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";

/**
 * TaffyPillNav — a floating pill nav whose bubblegum marker stretches like taffy.
 *
 * The marker's two ends run on two springs, the leading end quick and the
 * trailing end slow, so it stretches long and thin as it travels (area
 * kept) and squashes short and fat as it lands. The labels turn paper
 * exactly where the marker covers them. Controlled or uncontrolled.
 *
 * Part of the Tactile Maximalism kit: dough #f7f0e4, warm ink #17130f and
 * one loud accent, bubblegum #ff2d78, filled once per screen; grain fixed to
 * the material; soft shadows tinted by what casts them, never a hard offset.
 * Everything soft keeps its area as it squashes and settles inside 450ms.
 * Unbounded through var(--font-unbounded) for display over Geist. Respects
 * prefers-reduced-motion. No dependencies beyond React. Paste it as its own
 * file: it repeats the kit's small helpers, which would clash in one module.
 * Load Unbounded with next/font (variable: "--font-unbounded") on a
 * parent, or from Google Fonts or @fontsource.
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries plugin).
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const DISPLAY = 'var(--font-unbounded, "Unbounded", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

/** Dough, warm ink, and one loud accent. */
const DOUGH = {
  ground: "#f7f0e4",
  surface: "#fffaf1",
  well: "#efe5d3",
  solid: "#17130f",
  ink: "rgba(23,19,15,0.92)",
  ink2: "rgba(23,19,15,0.64)",
  ink3: "rgba(23,19,15,0.42)",
  line: "rgba(23,19,15,0.1)",
  line2: "rgba(23,19,15,0.18)",
  gum: "#ff2d78",
  gumDeep: "#d8155d",
  lilac: "#e8e1f6",
} as const;

/** A soft object resting in dough: a tight contact shadow and a wide one tinted by the object. */
function softShadow(tint = "23,19,15", lift = 1): string {
  return `0 ${(2 * lift).toFixed(1)}px ${(6 * lift).toFixed(1)}px rgba(23,19,15,0.1), 0 ${(18 * lift).toFixed(1)}px ${(40 * lift).toFixed(1)}px -8px rgba(${tint},${(0.2 * Math.min(1, lift)).toFixed(3)})`;
}

/** Pressed into the dough: both shadows collapse to one tight line. */
const PRESSED_SHADOW = "0 1px 3px rgba(23,19,15,0.14)";

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
 * Squash and stretch for one element, on a spring. `press(depth)` squashes it
 * onto its foot with its area kept (as short as it gets, it gets as wide);
 * `release()` lets it spring back past rest, one visible overshoot, settled
 * inside 450ms; `flick(v)` gives it a sideways jiggle (a skew) from a push.
 * The transform is written straight to the element; nothing re-renders.
 */
function useSquish(ref: RefObject<HTMLElement | null>, origin = "50% 100%") {
  const reduced = useReducedMotion();
  const st = useRef({ y: 1, v: 0, t: 1, sk: 0, skv: 0, raf: 0, last: 0 });
  const tickRef = useRef<(now: number) => void>(() => undefined);
  useEffect(() => {
    const s = st.current;
    const el = ref.current;
    if (el) {
      el.style.transformOrigin = origin;
      // The spring owns the transform; a stylesheet's transition would smear it.
      el.style.transitionProperty = el.style.transitionProperty && el.style.transitionProperty !== "all" ? el.style.transitionProperty : "none";
    }
    tickRef.current = (now: number) => {
      s.raf = 0;
      const dt = s.last ? Math.min(1 / 30, (now - s.last) / 1000) : 1 / 60;
      s.last = now;
      // k 420, c 18: one overshoot of about 20%, settled inside ~440ms.
      for (let i = 0; i < 3; i++) {
        const h = dt / 3;
        s.v += (420 * (s.t - s.y) - 18 * s.v) * h;
        s.y += s.v * h;
        s.skv += (-380 * s.sk - 20 * s.skv) * h;
        s.sk += s.skv * h;
      }
      const e = ref.current;
      const y = clamp(s.y, 0.5, 1.6);
      if (e) e.style.transform = `scale(${(1 / y).toFixed(4)}, ${y.toFixed(4)}) skewX(${s.sk.toFixed(3)}deg)`;
      const moving = Math.abs(s.v) > 0.002 || Math.abs(s.y - s.t) > 0.0015 || Math.abs(s.sk) > 0.02 || Math.abs(s.skv) > 0.05;
      if (moving) s.raf = requestAnimationFrame((t) => tickRef.current(t));
      else {
        s.last = 0;
        if (e && s.t === 1) {
          s.y = 1;
          s.sk = 0;
          e.style.transform = "";
        }
      }
    };
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.last = 0;
    };
  }, [ref, origin]);
  const kick = () => {
    const s = st.current;
    if (!s.raf) s.raf = requestAnimationFrame((t) => tickRef.current(t));
  };
  return {
    press: (depth = 0.86) => {
      if (reduced) return;
      st.current.t = clamp(depth, 0.6, 1);
      kick();
    },
    release: () => {
      st.current.t = 1;
      if (!reduced) kick();
    },
    flick: (v: number) => {
      if (reduced) return;
      st.current.skv += clamp(v, -1, 1) * 160;
      kick();
    },
  };
}

// Each part carries only the CSS it needs, so any one of them works on its own.
// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".tm-scope :focus-visible,.tm-scope:focus-visible{outline:2.5px solid var(--tm-ring,#17130f)!important;outline-offset:3px;border-radius:revert-layer}";

const TM_BUTTON_INK = {
  gum: { bg: DOUGH.gum, fg: "#fffaf1", tint: "255,45,120", border: "transparent" },
  ink: { bg: DOUGH.solid, fg: "#fffaf1", tint: "23,19,15", border: "transparent" },
  soft: { bg: DOUGH.surface, fg: DOUGH.solid, tint: "23,19,15", border: "rgba(23,19,15,0.1)" },
} as const;

export type TmButtonVariant = keyof typeof TM_BUTTON_INK;

/**
 * SquashPressButton — a pill that squashes under your finger and pops back.
 *
 * Press and it squashes onto its base where you pressed, its area kept (as it
 * gets shorter it gets wider); hold and it sinks further, up to a deep press
 * at 600ms; let go and it springs back past rest, one overshoot, settled
 * inside 450ms. Its two shadows (a contact and a wide one tinted by the pill's
 * own colour) collapse to one tight line while pressed. Swipe across it and it
 * jiggles the way you pushed it. Gum, ink and soft; a link when given an href.
 */
export function SquashPressButton({
  children,
  href,
  onClick,
  type = "button",
  variant = "ink",
  size = "lg",
  disabled = false,
  ariaLabel,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: TmButtonVariant;
  size?: "lg" | "md" | "sm";
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const ink = TM_BUTTON_INK[variant] ?? TM_BUTTON_INK.ink;
  const bodyRef = useRef<HTMLSpanElement>(null);
  const squish = useSquish(bodyRef);
  const [state, setState] = useState<"rest" | "hover" | "down">("rest");
  const hold = useRef({ t0: 0, raf: 0, x: 0, t: 0 });

  // Holding sinks it further: 0.9 at the press, 0.8 by 600ms.
  useEffect(() => {
    const h = hold.current;
    return () => {
      cancelAnimationFrame(h.raf);
      h.raf = 0;
    };
  }, []);
  const deepen = () => {
    const h = hold.current;
    const run = (now: number) => {
      h.raf = 0;
      const k = clamp((now - h.t0) / 600, 0, 1);
      squish.press(0.9 - 0.1 * k);
      if (k < 1) h.raf = requestAnimationFrame(run);
    };
    cancelAnimationFrame(h.raf);
    h.raf = requestAnimationFrame(run);
  };
  const down = (xPct: number) => {
    // It squashes onto its base under your finger, not about its middle.
    if (bodyRef.current) bodyRef.current.style.transformOrigin = `${clamp(xPct, 15, 85).toFixed(0)}% 100%`;
    setState("down");
    hold.current.t0 = performance.now();
    squish.press(0.9);
    deepen();
  };
  const up = (to: "rest" | "hover") => {
    cancelAnimationFrame(hold.current.raf);
    hold.current.raf = 0;
    setState(to);
    squish.release();
  };

  const pad = size === "sm" ? "h-9 px-4 text-[12.5px]" : size === "md" ? "h-11 px-5 text-[13.5px]" : "h-14 px-7 text-[15px]";
  const shadow = state === "down" ? PRESSED_SHADOW : softShadow(ink.tint, state === "hover" ? 1.3 : 1);
  const handlers = {
    "aria-label": ariaLabel,
    className: "tm-scope group relative inline-flex select-none rounded-full no-underline outline-none " + (disabled ? "pointer-events-none opacity-40 " : "") + className,
    style: { WebkitTapHighlightColor: "transparent", touchAction: "manipulation" } as CSSProperties,
    onPointerEnter: (e: ReactPointerEvent<HTMLElement>) => {
      setState("hover");
      hold.current.x = e.clientX;
      hold.current.t = performance.now();
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      hold.current.x = e.clientX;
      hold.current.t = performance.now();
    },
    onPointerLeave: (e: ReactPointerEvent<HTMLElement>) => {
      const dt = Math.max(8, performance.now() - hold.current.t);
      // A quick swipe out leaves it jiggling the way it was pushed.
      squish.flick(((e.clientX - hold.current.x) / dt) * 0.6);
      up("rest");
    },
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      const r = e.currentTarget.getBoundingClientRect();
      down(((e.clientX - r.left) / Math.max(1, r.width)) * 100);
    },
    onPointerUp: () => up("hover"),
    onPointerCancel: () => up("rest"),
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => {
      if (e.repeat) return;
      if (e.key === "Enter" || (e.key === " " && !href)) down(50);
    },
    onKeyUp: () => {
      if (state === "down") up("rest");
    },
    onBlur: () => {
      if (state === "down") up("rest");
    },
  };
  // The pill that squashes and its shadow live on an inner span, so the hit area never moves.
  const pill = (
    <span
      ref={bodyRef}
      className={"relative inline-flex items-center justify-center rounded-full " + pad}
      style={{
        background: ink.bg,
        color: ink.fg,
        border: `1px solid ${ink.border}`,
        boxShadow: shadow,
        fontFamily: DISPLAY,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        transition: "box-shadow 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        willChange: "transform",
      }}
    >
      <span className="whitespace-nowrap">{children}</span>
    </span>
  );
  if (href) {
    return (
      <>
        <style>{FOCUS_CSS}</style>
        <a href={safeHref(href)} onClick={onClick} {...handlers}>
          {pill}
        </a>
      </>
    );
  }
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <button type={type} onClick={onClick} disabled={disabled} {...handlers}>
        {pill}
      </button>
    </>
  );
}

export type TmLink = { label: string; href: string };

/**
 * TaffyPillNav — a floating pill nav whose bubblegum marker stretches like
 * taffy to the link you choose.
 *
 * The marker's two ends run on two springs: the leading end quick, the
 * trailing end slower, so it stretches long and thin as it travels (its area
 * kept: the longer, the thinner) and, when the leading end lands and the tail
 * catches up, it squashes short and fat before it settles. The labels turn
 * paper exactly where the marker covers them, mid-flight too. Arrow keys move
 * between links; the current one is marked for screen readers.
 */
export function TaffyPillNav({
  brand = "plushdrop",
  links = [
    { label: "Drops", href: "#drops" },
    { label: "How it works", href: "#how" },
    { label: "Artists", href: "#artists" },
    { label: "Pricing", href: "#pricing" },
  ],
  defaultActive = 0,
  active: activeProp,
  onChange,
  cta = { label: "Start a drop", href: "#" },
  ctaShort = "Start",
  className = "",
  style,
}: {
  brand?: string;
  links?: TmLink[];
  defaultActive?: number;
  /** Controlled: which link is current. */
  active?: number;
  onChange?: (index: number) => void;
  cta?: TmLink;
  /** The CTA's label on a narrow bar (the full label is its accessible name). */
  ctaShort?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [own, setOwn] = useState(defaultActive);
  const active = clamp(activeProp ?? own, 0, Math.max(0, links.length - 1));
  const rowRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const reduced = useReducedMotion();
  const sim = useRef({ l: 0, r: 0, vl: 0, vr: 0, tl: 0, tr: 0, h: 0, ready: false, raf: 0, last: 0 });
  const tickRef = useRef<(now: number) => void>(() => undefined);

  useEffect(() => {
    const st = sim.current;
    const paint = () => {
      const w = Math.max(1, st.r - st.l);
      const rest = Math.max(1, st.tr - st.tl);
      // Area kept: stretched long it gets thin, squashed short it gets fat.
      const h = clamp(st.h * Math.sqrt(rest / w), st.h * 0.62, st.h * 1.22);
      const top = (rowRef.current?.clientHeight ?? st.h) / 2 - h / 2;
      const p = pillRef.current;
      if (p) {
        p.style.transform = `translate(${st.l.toFixed(2)}px, ${top.toFixed(2)}px)`;
        p.style.width = `${w.toFixed(2)}px`;
        p.style.height = `${h.toFixed(2)}px`;
      }
      const row = rowRef.current;
      const paper = paperRef.current;
      if (paper && row) paper.style.clipPath = `inset(${top.toFixed(2)}px ${(row.clientWidth - st.r).toFixed(2)}px ${(row.clientHeight - top - h).toFixed(2)}px ${st.l.toFixed(2)}px round ${(h / 2).toFixed(2)}px)`;
    };
    tickRef.current = (now: number) => {
      st.raf = 0;
      const dt = st.last ? Math.min(1 / 30, (now - st.last) / 1000) : 1 / 60;
      st.last = now;
      const right = st.tl > st.l;
      for (let i = 0; i < 3; i++) {
        const h = dt / 3;
        // Leading end k 420 c 30, trailing end k 170 c 20.
        const [kl, cl] = right ? [170, 20] : [420, 30];
        const [kr, cr] = right ? [420, 30] : [170, 20];
        st.vl += (kl * (st.tl - st.l) - cl * st.vl) * h;
        st.vr += (kr * (st.tr - st.r) - cr * st.vr) * h;
        st.l += st.vl * h;
        st.r += st.vr * h;
      }
      paint();
      const moving = Math.abs(st.vl) + Math.abs(st.vr) > 0.05 || Math.abs(st.tl - st.l) + Math.abs(st.tr - st.r) > 0.1;
      if (moving) st.raf = requestAnimationFrame((n) => tickRef.current(n));
      else {
        st.last = 0;
        st.l = st.tl;
        st.r = st.tr;
        paint();
      }
    };
    const measure = () => {
      const a = linkRefs.current[active];
      const row = rowRef.current;
      if (!a || !row) return;
      st.tl = a.offsetLeft;
      st.tr = a.offsetLeft + a.offsetWidth;
      st.h = a.offsetHeight;
      // The first time (and without motion) it simply appears where it belongs.
      if (!st.ready || reduced) {
        st.l = st.tl;
        st.r = st.tr;
        st.vl = st.vr = 0;
        st.ready = true;
        paint();
        return;
      }
      if (!st.raf) st.raf = requestAnimationFrame((n) => tickRef.current(n));
    };
    measure();
    const ro = new ResizeObserver(() => {
      st.ready = false;
      measure();
    });
    if (rowRef.current) ro.observe(rowRef.current);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      st.last = 0;
    };
  }, [active, reduced, links.length]);

  const choose = (i: number) => {
    if (activeProp === undefined) setOwn(i);
    onChange?.(i);
  };
  const onKey = (e: ReactKeyboardEvent<HTMLAnchorElement>, i: number) => {
    const n = links.length;
    const next = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    linkRefs.current[next]?.focus();
  };
  const label = "relative inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 text-[14px] no-underline";

  return (
    <nav aria-label="Main" className={"tm-scope relative w-full @container " + className} style={{ fontFamily: SANS, ...style }}>
      <style>{FOCUS_CSS}</style>
      <div className="flex items-center gap-3 rounded-full py-2 pl-5 pr-2" style={{ background: DOUGH.surface, boxShadow: softShadow(), border: `1px solid ${DOUGH.line}` }}>
        <a href="#" className="shrink-0 text-[17px] no-underline" style={{ fontFamily: DISPLAY, fontWeight: 800, letterSpacing: "-0.04em", color: DOUGH.solid }}>
          {brand}
          <span style={{ color: DOUGH.gum }}>.</span>
        </a>
        {/* On a narrow bar the links scroll; the fades at the edges say so. */}
        <div className="relative mx-auto min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ maskImage: "linear-gradient(90deg, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)", WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)" }}>
          <div ref={rowRef} className="relative flex items-center">
            <span ref={pillRef} aria-hidden className="pointer-events-none absolute left-0 top-0 block rounded-full" style={{ background: DOUGH.gum, boxShadow: "0 6px 16px -6px rgba(216,21,93,0.5)", transition: "none" }} />
            {links.map((l, i) => (
              <a
                key={l.label}
                ref={(el) => void (linkRefs.current[i] = el)}
                href={safeHref(l.href)}
                aria-current={i === active ? "page" : undefined}
                onClick={() => choose(i)}
                onKeyDown={(e) => onKey(e, i)}
                className={label}
                style={{ color: DOUGH.ink }}
              >
                {l.label}
              </a>
            ))}
            {/* The same labels in paper, shown only where the marker is. */}
            <div ref={paperRef} aria-hidden className="pointer-events-none absolute inset-0 flex items-center" style={{ transition: "none" }}>
              {links.map((l) => (
                <span key={l.label} className={label} style={{ color: "#fffaf1" }}>
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="hidden shrink-0 @2xl:block">
          <SquashPressButton href={cta.href} size="sm" variant="ink">
            {cta.label}
          </SquashPressButton>
        </div>
        <div className="shrink-0 @2xl:hidden">
          <SquashPressButton href={cta.href} size="sm" variant="ink" ariaLabel={cta.label}>
            {ctaShort}
          </SquashPressButton>
        </div>
      </div>
    </nav>
  );
}
