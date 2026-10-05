"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";

/**
 * WobbleDropCard — a release card you can push around, with a sticker that lags behind.
 *
 * The card leans toward the pointer on a soft spring and the sticker on
 * its corner follows through, swinging the other way and jiggling to a
 * stop. Press the card and it squashes onto its base, area kept, then pops
 * back. The cover is drawn in code; a squash button adds it to the bag.
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

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

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

/** Static film grain as an SVG noise tile, for CSS backgrounds (4-6% is the kit's range). */
function grainUrl(opacity = 0.05): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.09 0 0 0 0 0.07 0 0 0 0 0.06 0 0 0 ${opacity} 0'/></filter><rect width='160' height='160' filter='url(%23g)'/></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E")}")`;
}

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

export type TmCover = { bg: string; fg: string; shape: "dot" | "wave" | "stack" };

export type TmDrop = {
  title: string;
  artist: string;
  price: string;
  formats: string[];
  sticker?: string;
  stickerTone?: "gum" | "ink" | "lilac";
  cover: TmCover;
  href: string;
  cta: string;
};

/** A cover drawn in code: one bold shape on a flat ground, with grain. */
function TmCoverArt({ cover, title }: { cover: TmCover; title: string }) {
  const { bg, fg, shape } = cover;
  return (
    <div aria-hidden className="relative aspect-square w-full overflow-hidden rounded-[20px]" style={{ background: bg }}>
      {shape === "dot" ? (
        <div className="absolute rounded-full" style={{ width: "74%", height: "74%", left: "13%", top: "8%", background: fg }} />
      ) : shape === "wave" ? (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M0 ${38 + i * 16} C 22 ${24 + i * 16}, 40 ${54 + i * 16}, 62 ${38 + i * 16} S 92 ${26 + i * 16}, 100 ${36 + i * 16} L100 100 L0 100 Z`} fill={fg} opacity={0.34 + i * 0.22} />
          ))}
        </svg>
      ) : (
        // A pile of three cushions, each a little askew.
        [
          { w: 84, b: 12, r: -4 },
          { w: 70, b: 31, r: 5 },
          { w: 54, b: 50, r: -3 },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{ width: `${c.w}%`, height: "19%", left: `${(100 - c.w) / 2}%`, bottom: `${c.b}%`, background: fg, transform: `rotate(${c.r}deg)`, boxShadow: "0 10px 18px -8px rgba(0,0,0,0.45)" }}
          />
        ))
      )}
      <div className="absolute inset-0" style={{ backgroundImage: grainUrl(0.05) }} />
      <p className="absolute bottom-[7%] left-[8%] m-0 max-w-[80%] text-[clamp(14px,6.2cqw,26px)] leading-[0.95]" style={{ fontFamily: DISPLAY, fontWeight: 800, letterSpacing: "-0.04em", color: shape === "wave" ? bg : fg }}>
        {shape === "stack" ? "" : title}
      </p>
    </div>
  );
}

const TM_STICKER_INK = {
  gum: { bg: DOUGH.gum, fg: "#fffaf1", tint: "216,21,93" },
  ink: { bg: DOUGH.solid, fg: "#fffaf1", tint: "23,19,15" },
  lilac: { bg: DOUGH.lilac, fg: DOUGH.solid, tint: "23,19,15" },
} as const;

/**
 * WobbleDropCard — a release card you can push around, with a sticker that
 * lags behind.
 *
 * The card leans toward the pointer (up to 6 degrees) on a soft spring, and
 * the sticker on its corner follows through: it swings the other way as the
 * card moves and jiggles to a stop, the way a real sticker's free edge would.
 * Press the card and it squashes onto its base, area kept, then pops back;
 * the sticker bounces with it. The cover is drawn in code. A link on the
 * title and a squash button to add it to the bag.
 */
export function WobbleDropCard({ drop, onAdd, className = "" }: { drop: TmDrop; onAdd?: (drop: TmDrop) => void; className?: string }) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stickerRef = useRef<HTMLSpanElement>(null);
  const squish = useSquish(cardRef);
  const reduced = useReducedMotion();
  const sim = useRef({ rx: 0, ry: 0, vx: 0, vy: 0, tx: 0, ty: 0, a: 0, av: 0, raf: 0, last: 0 });
  const tickRef = useRef<(now: number) => void>(() => undefined);
  const s = TM_STICKER_INK[drop.stickerTone ?? "gum"] ?? TM_STICKER_INK.gum;

  useEffect(() => {
    const st = sim.current;
    tickRef.current = (now: number) => {
      st.raf = 0;
      const dt = st.last ? Math.min(1 / 30, (now - st.last) / 1000) : 1 / 60;
      st.last = now;
      for (let i = 0; i < 2; i++) {
        const h = dt / 2;
        // The card leans on a soft spring (k 170, c 18); the sticker is driven by the card's swing.
        const ax = 170 * (st.tx - st.rx) - 18 * st.vx;
        const ay = 170 * (st.ty - st.ry) - 18 * st.vy;
        st.vx += ax * h;
        st.vy += ay * h;
        st.rx += st.vx * h;
        st.ry += st.vy * h;
        st.av += (-260 * st.a - 9 * st.av - st.vy * 9) * h;
        st.a += st.av * h;
      }
      const t = tiltRef.current;
      if (t) t.style.transform = `perspective(900px) rotateX(${st.rx.toFixed(3)}deg) rotateY(${st.ry.toFixed(3)}deg)`;
      const k = stickerRef.current;
      if (k) k.style.transform = `rotate(${(-12 + st.a).toFixed(3)}deg)`;
      const moving = Math.abs(st.vx) + Math.abs(st.vy) + Math.abs(st.av) > 0.02 || Math.abs(st.tx - st.rx) + Math.abs(st.ty - st.ry) > 0.01 || Math.abs(st.a) > 0.05;
      if (moving) st.raf = requestAnimationFrame((n) => tickRef.current(n));
      else st.last = 0;
    };
    return () => {
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      st.last = 0;
    };
  }, []);
  const kick = () => {
    const st = sim.current;
    if (!reduced && !st.raf) st.raf = requestAnimationFrame((n) => tickRef.current(n));
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / Math.max(1, r.width) - 0.5;
    const py = (e.clientY - r.top) / Math.max(1, r.height) - 0.5;
    sim.current.tx = -py * 12;
    sim.current.ty = px * 12;
    kick();
  };
  const onLeave = () => {
    sim.current.tx = 0;
    sim.current.ty = 0;
    squish.release();
    kick();
  };

  return (
    <div
      ref={tiltRef}
      className={"tm-scope relative w-full @container " + className}
      style={{ transformStyle: "preserve-3d", willChange: "transform", transition: "none" }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={(e) => {
        if (e.button !== 0 || (e.target instanceof Element && e.target.closest("a,button"))) return;
        squish.press(0.93);
        sim.current.av += 60;
        kick();
      }}
      onPointerUp={() => squish.release()}
      onPointerCancel={() => squish.release()}
    >
      <style>{FOCUS_CSS}</style>
      <div ref={cardRef} className="flex flex-col gap-4 rounded-[28px] p-3.5" style={{ background: DOUGH.surface, boxShadow: softShadow(), border: `1px solid ${DOUGH.line}`, transition: "none" }}>
        <div className="relative">
          <TmCoverArt cover={drop.cover} title={drop.title} />
          {drop.sticker ? (
            <span
              ref={stickerRef}
              className="absolute -right-2 -top-3 flex h-[76px] w-[76px] items-center justify-center rounded-full text-center text-[11.5px] leading-[1.05]"
              style={{ background: s.bg, color: s.fg, fontFamily: DISPLAY, fontWeight: 700, letterSpacing: "-0.01em", boxShadow: softShadow(s.tint, 0.7), transform: "rotate(-12deg)", transformOrigin: "30% 20%", transition: "none" }}
            >
              {drop.sticker}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 px-1.5 pb-1.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <a href={safeHref(drop.href)} className="block truncate text-[18px] leading-[1.15] no-underline" style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: "-0.02em", color: DOUGH.solid }}>
                {drop.title}
              </a>
              <p className="m-0 mt-1 truncate text-[14px]" style={{ fontFamily: SANS, color: DOUGH.ink2 }}>
                {drop.artist}
              </p>
            </div>
            <p className="m-0 shrink-0 text-[18px] tabular-nums" style={{ fontFamily: DISPLAY, fontWeight: 700, color: DOUGH.solid }}>
              {drop.price}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Formats">
              {drop.formats.map((f) => (
                <li key={f} className="rounded-full px-2.5 py-1 text-[10.5px] uppercase" style={{ fontFamily: MONO, letterSpacing: "0.08em", background: DOUGH.lilac, color: DOUGH.solid }}>
                  {f}
                </li>
              ))}
            </ul>
            <SquashPressButton size="sm" variant="ink" onClick={() => onAdd?.(drop)} ariaLabel={`${drop.cta}: ${drop.title}`}>
              {drop.cta}
            </SquashPressButton>
          </div>
        </div>
      </div>
    </div>
  );
}
