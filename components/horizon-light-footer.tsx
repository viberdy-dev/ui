"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";

/**
 * HorizonLightFooter — a footer lit from below by a horizon that is a signal.
 *
 * Link columns, a status pill and a legal line sit above the brand as a
 * giant lowercase wordmark cropped by the bottom edge. Along the crop runs
 * a faint latency trace. Its brightest point, with the light it throws up
 * the letters, tracks the pointer (and swings on a slow 40-second cycle when
 * the pointer is away). Every few seconds a request pulse runs the trace
 * from left to right and lights the letters as it passes beneath them.
 *
 * Part of the Dark Precision kit: OLED black, 1px hairlines, one cool accent
 * used only as light (default #4fd1ff; also mint, amber, white or any
 * #rrggbb). Fonts come from CSS variables with Geist fallbacks. Respects
 * prefers-reduced-motion. No dependencies beyond React.
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries plugin).
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

const GROUND = "#050505";

const INK = "rgba(255,255,255,0.92)";

const INK_2 = "rgba(255,255,255,0.6)";

const INK_3 = "rgba(255,255,255,0.38)";

const LINE_2 = "rgba(255,255,255,0.14)";

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

/** A small seeded random generator, so the lattice is the same on every load. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".dp-scope :focus-visible,.dp-scope:focus-visible{outline:2px solid var(--dp-accent);outline-offset:3px;border-radius:revert-layer}";

/** The accent as the CSS variables the focus ring and the keyframes read. */
function accentVars(hex: string): CSSProperties {
  const [r, g, b] = rgbOf(hex);
  return { "--dp-accent": hex, "--dp-accent-rgb": `${r} ${g} ${b}` } as CSSProperties;
}

export type DpLink = { label: string; href: string };

function Mark({ accent, size = 18 }: { accent: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="6.75" stroke="rgba(255,255,255,0.7)" strokeWidth="1.25" />
      <circle cx="9" cy="9" r="2" fill="rgba(255,255,255,0.92)" />
      <circle cx="13.8" cy="4.2" r="1.7" fill={accent} />
    </svg>
  );
}

/** A quiet latency trace across the width: a near-flat line with a few request spikes, seeded. */
function signalPoints(w: number, h: number): { d: string; len: number } {
  const rnd = mulberry32(4051);
  const spikes: { x: number; hgt: number; half: number }[] = [];
  const count = Math.max(3, Math.round(w / 170));
  for (let i = 0; i < count; i++) {
    spikes.push({ x: w * ((i + 0.3 + rnd() * 0.4) / count), hgt: 5 + rnd() * (h - 9), half: 5 + rnd() * 8 });
  }
  let d = "";
  let len = 0;
  let px = 0;
  let py = h - 0.5;
  for (let x = 0; x <= w; x += 4) {
    let y = Math.sin(x * 0.045) * 0.6 + (rnd() - 0.5) * 0.9;
    for (const s of spikes) {
      const k = 1 - Math.abs(x - s.x) / s.half;
      if (k > 0) y += s.hgt * k * k;
    }
    const yy = h - 0.5 - Math.max(0, y);
    if (x === 0) d = `M0 ${yy.toFixed(1)}`;
    else {
      d += ` L${x} ${yy.toFixed(1)}`;
      len += Math.hypot(x - px, yy - py);
    }
    px = x;
    py = yy;
  }
  return { d, len };
}

export type HorizonLightFooterProps = {
  brand: string;
  columns: { title: string; links: DpLink[] }[];
  status?: string;
  legal?: string;
  accent?: string;
  wordmark?: boolean;
  /** Seconds between request pulses along the horizon; 0 turns them off. */
  pulse?: number;
};

/**
 * A footer whose giant wordmark is lit from below by a horizon that is also a
 * signal: a faint latency trace runs along the crop. The brightest point of
 * the horizon tracks the pointer (and swings slowly on a 40s cycle when the
 * pointer is away), lighting the trace and the letters above it. Every few
 * seconds a request pulse runs the trace from left to right and lights the
 * letters as it passes beneath them: the last hop landing.
 */
export function HorizonLightFooter({ brand, columns, status, legal, accent = "ice", wordmark = true, pulse = 10 }: HorizonLightFooterProps) {
  const acc = accentHex(accent);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const H = 30;
  const sig = useMemo(() => (w > 0 ? signalPoints(w, H) : null), [w]);

  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const ro = new ResizeObserver(() => setW(band.offsetWidth));
    ro.observe(band);
    return () => ro.disconnect();
  }, [wordmark]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stops = Array.from(el.querySelectorAll<SVGStopElement>("stop[data-at]"));
    const runner = el.querySelectorAll<SVGPathElement>("path[data-pulse]");
    const len = sig ? sig.len : 0;
    let x = 0.5;
    let target = 0.5;
    let last = 0;
    let lastMove = -1e9;
    let raf = 0;
    let running = false;
    let visible = false;
    let clock = 0;
    let since = pulse > 0 ? pulse - 2 : 0;
    let travel = -1;
    const TRAVEL = 2.6;
    const DASH = 70;
    const paint = () => {
      el.style.setProperty("--hx", (x * 100).toFixed(2) + "%");
      for (const s of stops) {
        const at = Math.min(1, Math.max(0, x + Number(s.dataset.at)));
        s.setAttribute("offset", at.toFixed(4));
      }
      const p = travel < 0 ? -1 : travel / TRAVEL;
      const alpha = p < 0 ? 0 : Math.sin(Math.min(1, p) * Math.PI) * 0.75;
      el.style.setProperty("--px", (Math.max(0, p) * 100).toFixed(2) + "%");
      el.style.setProperty("--pa", alpha.toFixed(3));
      runner.forEach((r) => {
        const d = Number(r.dataset.pulse);
        const s = p < 0 ? -DASH : p * (len + DASH);
        r.style.strokeDasharray = d + " " + (len + 400);
        r.style.strokeDashoffset = String(d - s);
      });
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      clock += dt;
      if (now - lastMove > 2500) target = reduced ? 0.5 : 0.5 + 0.3 * Math.sin((clock * 2 * Math.PI) / 40);
      x += (target - x) * (1 - Math.exp(-dt * 3.5));
      if (!reduced && pulse > 0 && len > 0) {
        if (travel >= 0) {
          travel += dt;
          if (travel > TRAVEL) travel = -1;
        } else {
          since += dt;
          if (since >= pulse) {
            since = 0;
            travel = 0;
          }
        }
      }
      paint();
      if (visible && (!reduced || Math.abs(target - x) > 0.0005)) raf = requestAnimationFrame(tick);
      else {
        running = false;
        last = 0;
      }
    };
    const kick = () => {
      if (running || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target = Math.min(1, Math.max(0, (e.clientX - r.left) / (r.width || 1)));
      lastMove = e.timeStamp;
      kick();
    };
    const onVis = () => {
      if (!document.hidden) kick();
    };
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) kick();
    });
    io.observe(el);
    paint();
    el.addEventListener("pointermove", onMove);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced, pulse, sig]);

  return (
    <footer ref={ref} className="dp-scope @container relative overflow-hidden" style={{ ...accentVars(acc), background: GROUND, fontFamily: SANS, "--hx": "50%", "--px": "0%", "--pa": "0" } as CSSProperties}>
      <style>{FOCUS_CSS}</style>
      <div className="mx-auto max-w-[1120px] px-6 pt-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 @3xl:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="col-span-2 @3xl:col-span-1">
            <div className="flex items-center gap-2.5">
              <Mark accent={acc} />
              <span className="text-[15px] font-semibold tracking-[-0.01em]" style={{ color: INK }}>
                {brand}
              </span>
            </div>
            {status && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px]" style={{ color: INK_2, boxShadow: `inset 0 0 0 1px ${LINE_2}` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: acc, boxShadow: `0 0 8px ${acc}` }} />
                {status}
              </p>
            )}
          </div>
          {columns.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="text-[12px] uppercase tracking-[0.12em]" style={{ fontFamily: MONO, color: INK_3 }}>
                {c.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a href={safeHref(l.href)} className="text-[14px] transition-colors hover:text-white" style={{ color: INK_2 }}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        {legal && (
          <p className="mt-16 text-[12px]" style={{ fontFamily: MONO, color: INK_3 }}>
            {legal}
          </p>
        )}
      </div>
      {wordmark && (
        <div ref={bandRef} aria-hidden className="relative mt-6 select-none overflow-hidden" style={{ height: "clamp(80px, 17cqw, 230px)" }}>
          <div
            className="absolute inset-x-0 bottom-0 h-[70%]"
            style={{ background: `radial-gradient(38% 100% at var(--hx) 100%, ${rgba(acc, 0.28)}, ${rgba(acc, 0.06)} 55%, transparent 80%)`, filter: "blur(8px)" }}
          />
          <p
            className="absolute inset-x-0 text-center font-semibold leading-none"
            style={{
              bottom: "-0.2em",
              fontSize: "clamp(110px, 25cqw, 340px)",
              letterSpacing: "-0.065em",
              color: "transparent",
              backgroundImage: `radial-gradient(16% 60% at var(--px) 100%, rgb(255 255 255 / var(--pa)), transparent 70%), radial-gradient(34% 70% at var(--hx) 100%, rgba(255,255,255,0.95), ${rgba(acc, 0.45)} 38%, transparent 72%), linear-gradient(0deg, rgba(255,255,255,0.14), rgba(255,255,255,0.025) 70%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            {brand.toLowerCase()}
          </p>
          {sig && (
            <svg className="absolute bottom-0 left-0 overflow-visible" width={w} height={H}>
              <defs>
                <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w} y2="0">
                  <stop data-at="-0.2" offset="0.3" stopColor={acc} stopOpacity="0" />
                  <stop data-at="-0.07" offset="0.43" stopColor={acc} stopOpacity="0.8" />
                  <stop data-at="0" offset="0.5" stopColor="#ffffff" stopOpacity="1" />
                  <stop data-at="0.07" offset="0.57" stopColor={acc} stopOpacity="0.8" />
                  <stop data-at="0.2" offset="0.7" stopColor={acc} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={sig.d} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
              <path d={sig.d} fill="none" stroke={`url(#${gid})`} strokeWidth="1.25" />
              {!reduced && pulse > 0 && (
                <>
                  <path data-pulse="70" d={sig.d} fill="none" stroke={acc} strokeWidth="4" strokeLinecap="round" style={{ opacity: 0.35, filter: "blur(3px)", strokeDasharray: "0 99999" }} />
                  <path data-pulse="40" d={sig.d} fill="none" stroke={acc} strokeWidth="1.5" strokeLinecap="round" style={{ strokeDasharray: "0 99999" }} />
                  <path data-pulse="8" d={sig.d} fill="none" stroke="#ffffff" strokeWidth="1.75" strokeLinecap="round" style={{ strokeDasharray: "0 99999" }} />
                </>
              )}
            </svg>
          )}
          <div className="absolute inset-x-0 -bottom-1 h-2" style={{ background: `radial-gradient(18% 100% at var(--hx) 50%, ${rgba(acc, 0.7)}, transparent 70%)`, filter: "blur(4px)" }} />
        </div>
      )}
    </footer>
  );
}
