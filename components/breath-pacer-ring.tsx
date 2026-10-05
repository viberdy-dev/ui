"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * BreathPacer — a breathing guide in soft light.
 *
 * A grained halo swells as you breathe in and settles as you breathe out
 * (four in, six out by default, with an optional hold), a thin ring traces
 * each phase and the seconds count down in the middle. It starts only when
 * asked, pauses and resumes where it was, and rests after the set number of
 * breaths. Each phase is announced once for screen readers; under reduced
 * motion the halo stays still and the words and count guide the breath.
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

type BreathPhase = "in" | "hold" | "out";

export type BreathPacerProps = {
  /** Seconds breathing in, holding and breathing out. 4 / 0 / 6 is a calm, common count. */
  inhale?: number;
  hold?: number;
  exhale?: number;
  /** How many breaths before it rests. */
  cycles?: number;
  tone?: DgTone;
  glow?: string;
  /** Diameter of the pacer in px. */
  size?: number;
  labels?: { in: string; hold: string; out: string; begin: string; pause: string; again: string; done: string };
  className?: string;
};

/**
 * A breathing guide: a soft, grained halo that swells as you breathe in and
 * settles as you breathe out, with a thin ring tracing each phase and the
 * seconds counting down in the middle. It only starts when asked (Begin),
 * pauses and resumes where it was, and rests after the set number of breaths.
 * The phase is announced once per change for screen readers. Under reduced
 * motion the halo stays still and the words and count still guide the
 * breath.
 */
export function BreathPacer({
  inhale = 4,
  hold = 0,
  exhale = 6,
  cycles = 6,
  tone = "day",
  glow,
  size = 280,
  labels = { in: "Breathe in", hold: "Hold", out: "Breathe out", begin: "Begin", pause: "Pause", again: "Once more", done: "That is enough. Come in when you are ready." },
  className,
}: BreathPacerProps) {
  const t = toneOf(tone);
  const light = glowHex(glow ?? (tone === "jewel" ? "gold" : "jade"));
  const reduced = useReducedMotion();
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<BreathPhase | "rest" | "done">("rest");
  const [count, setCount] = useState(0);
  const [cycle, setCycle] = useState(0);
  const haloRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const clock = useRef({ offset: 0, since: 0 });
  const R = 46;
  const C = 2 * Math.PI * R;

  useEffect(() => {
    if (!running) return;
    const inS = Math.max(1, Math.min(30, inhale));
    const holdS = Math.max(0, Math.min(30, hold));
    const outS = Math.max(1, Math.min(30, exhale));
    const len = inS + holdS + outS;
    const total = Math.max(1, Math.min(100, cycles));
    const ck = clock.current;
    ck.since = performance.now();
    let raf = 0;
    let lastPhase = "";
    let lastCount = -1;
    let lastCycle = -1;
    const ease = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * p);
    const step = () => {
      const elapsed = ck.offset + (performance.now() - ck.since) / 1000;
      const c = Math.floor(elapsed / len);
      if (c >= total) {
        ck.offset = 0;
        setRunning(false);
        setPhase("done");
        if (haloRef.current) haloRef.current.style.transform = "scale(0.7)";
        if (ringRef.current) ringRef.current.style.strokeDashoffset = String(C);
        return;
      }
      const w = elapsed - c * len;
      let ph: BreathPhase;
      let p: number;
      let left: number;
      if (w < inS) {
        ph = "in";
        p = w / inS;
        left = inS - w;
      } else if (w < inS + holdS) {
        ph = "hold";
        p = (w - inS) / holdS;
        left = inS + holdS - w;
      } else {
        ph = "out";
        p = (w - inS - holdS) / outS;
        left = len - w;
      }
      const scale = ph === "in" ? 0.55 + 0.45 * ease(p) : ph === "hold" ? 1 : 1 - 0.45 * ease(p);
      if (haloRef.current && !reduced) haloRef.current.style.transform = `scale(${scale.toFixed(4)})`;
      if (ringRef.current) ringRef.current.style.strokeDashoffset = (C * (1 - p)).toFixed(2);
      if (ph !== lastPhase) {
        lastPhase = ph;
        setPhase(ph);
      }
      const secs = Math.ceil(left);
      if (secs !== lastCount) {
        lastCount = secs;
        setCount(secs);
      }
      if (c !== lastCycle) {
        lastCycle = c;
        setCycle(c);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      // Keep where we were, so Begin resumes.
      ck.offset += (performance.now() - ck.since) / 1000;
    };
  }, [running, inhale, hold, exhale, cycles, reduced, C]);

  const toggle = () => {
    if (phase === "done") {
      clock.current.offset = 0;
      setCycle(0);
    }
    setRunning((r) => !r);
  };

  const word = phase === "in" ? labels.in : phase === "hold" ? labels.hold : phase === "out" ? labels.out : "";
  return (
    <div className={"dg-scope flex flex-col items-center" + (className ? " " + className : "")} style={{ ...ringVar(tone), color: t.ink, fontFamily: SANS }}>
      <style>{FOCUS_CSS}</style>
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <span aria-hidden className="absolute inset-0 rounded-full" style={{ boxShadow: `inset 0 0 0 1px ${t.line2}` }} />
        <span ref={haloRef} aria-hidden className="absolute inset-[6%] rounded-full" style={{ transform: "scale(0.7)", willChange: "transform" }}>
          <span className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(closest-side, ${rgba(light, tone === "jewel" ? 0.8 : 0.85)}, ${rgba(light, 0.25)} 60%, ${rgba(light, 0)})` }} />
          <span
            className="absolute inset-0 rounded-full"
            style={{ backgroundImage: GRAIN_URL, mixBlendMode: "overlay", opacity: 0.65, WebkitMaskImage: "radial-gradient(closest-side, #000, transparent)", maskImage: "radial-gradient(closest-side, #000, transparent)" }}
          />
        </span>
        <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
          <circle ref={ringRef} cx="50" cy="50" r={R} fill="none" stroke={tone === "jewel" ? "rgba(243,237,226,0.7)" : "rgba(34,31,26,0.55)"} strokeWidth="0.6" strokeDasharray={C} strokeDashoffset={C} strokeLinecap="round" />
        </svg>
        <div className="relative text-center">
          {phase === "rest" || phase === "done" ? (
            <p className="m-0 text-[12px] uppercase tracking-[0.16em]" style={{ fontFamily: MONO, color: t.ink2 }}>
              In for {inhale}
              {hold > 0 ? ` · hold ${hold}` : ""} · out for {exhale}
            </p>
          ) : (
            <p className="m-0 text-[30px] italic leading-none" style={{ fontFamily: SERIF, fontWeight: 360 }}>
              {word}
            </p>
          )}
          {running && (
            <p className="m-0 mt-3 text-[13px] tabular-nums" style={{ fontFamily: MONO, color: t.ink2 }}>
              {count}
            </p>
          )}
        </div>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {phase === "done" ? labels.done : running ? word : ""}
      </p>
      {phase === "done" && (
        <p className="m-0 mt-6 max-w-[30ch] text-center text-[15px] leading-relaxed" style={{ color: t.ink2 }}>
          {labels.done}
        </p>
      )}
      <div className="mt-6 flex items-center gap-4">
        <SoftGlowButton tone={tone} variant="quiet" glow={glow} onClick={toggle}>
          {running ? labels.pause : phase === "done" ? labels.again : labels.begin}
        </SoftGlowButton>
        {(running || (phase !== "rest" && phase !== "done")) && (
          <span className="text-[12px] uppercase tracking-[0.16em]" style={{ fontFamily: MONO, color: t.ink3 }}>
            {Math.min(cycle + 1, Math.max(1, cycles))} / {Math.max(1, cycles)}
          </span>
        )}
      </div>
    </div>
  );
}
