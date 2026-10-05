"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";

/**
 * AxisScrubHeading — a heading written by the scroll.
 *
 * As the heading rises through the view a wave passes through it from the
 * first letter to the last: a condensed hairline, then a heavy, wide,
 * high-contrast peak in the accent, then the set identity. Scroll back and it
 * unwrites; the scroll position is the state. Lines can stand flush, and a
 * progress prop drives it by hand. Reduced motion shows it set.
 *
 * Part of the Kinetic Type kit: paper #f0ede2 and ink #131315 (an inverted
 * ink stage for loud sections), one accent that letters take only under
 * load (cobalt #2b3bff by default), and Science Gothic through
 * var(--font-science), whose weight (100-900), width (50-200), slant (-10-0)
 * and contrast (CTRS 0-85) axes are the interface. Respects
 * prefers-reduced-motion. No dependencies beyond React. Paste it as its own
 * file: it repeats the kit's small helpers and type engine, which would
 * clash in one module. Load Science Gothic with next/font (axes: ["wdth",
 * "slnt", "CTRS"], variable: "--font-science") on a parent; elsewhere, load
 * it from Google Fonts or @fontsource and set --font-science yourself. In a
 * face without a width axis, flush lines fall back to fitting by size.
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries plugin).
 */

const DISPLAY = 'var(--font-science, "Science Gothic", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The two grounds: paper, and the inverted ink stage for one loud section. */
export type KtTone = "paper" | "ink";

const TONES = {
  paper: {
    ground: "#f0ede2",
    panel: "#e8e4d6",
    ink: "#131315",
    ink2: "rgba(19,19,21,0.68)",
    ink3: "rgba(19,19,21,0.46)",
    line: "rgba(19,19,21,0.14)",
    line2: "rgba(19,19,21,0.3)",
  },
  ink: {
    ground: "#131315",
    panel: "#1c1c20",
    ink: "#f0ede2",
    ink2: "rgba(240,237,226,0.7)",
    ink3: "rgba(240,237,226,0.48)",
    line: "rgba(240,237,226,0.14)",
    line2: "rgba(240,237,226,0.3)",
  },
} as const;

/** The accent letters take under load, per ground (the ink stage needs a lighter one to read). */
export const KT_PALETTES = {
  cobalt: { paper: "#2b3bff", ink: "#8f98ff" },
  vermilion: { paper: "#d9360b", ink: "#ff6a3d" },
  mono: { paper: "#131315", ink: "#f0ede2" },
} as const;

export type KtPaletteName = keyof typeof KT_PALETTES;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

function toneOf(tone: string) {
  return own(TONES, tone) ? TONES[tone] : TONES.paper;
}

/** The accent for a palette on a ground. */
function accentOf(palette: string, tone: string): string {
  const p = own(KT_PALETTES, palette) ? KT_PALETTES[palette] : KT_PALETTES.cobalt;
  return tone === "ink" ? p.ink : p.paper;
}

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt((HEX.test(hex) ? hex : "#131315").slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a: string, b: string, k: number): string {
  const x = rgbOf(a);
  const y = rgbOf(b);
  const t = Math.max(0, Math.min(1, k));
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
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

/** The element that scrolls: null for the window, or the site itself in "self" mode. */
const ScrollRootContext = createContext<RefObject<HTMLElement | null> | null>(null);

/** A point in the face's design space: weight, width, slant and contrast. */
export type KtAxes = { wght: number; wdth: number; slnt: number; CTRS: number };

/** A setting: weight, width, contrast and slant. */
function ax(wght: number, wdth: number, CTRS = 0, slnt = 0): KtAxes {
  return { wght, wdth, slnt, CTRS };
}

function mixAxes(a: KtAxes, b: KtAxes, k: number): KtAxes {
  return {
    wght: a.wght + (b.wght - a.wght) * k,
    wdth: a.wdth + (b.wdth - a.wdth) * k,
    slnt: a.slnt + (b.slnt - a.slnt) * k,
    CTRS: a.CTRS + (b.CTRS - a.CTRS) * k,
  };
}

/** The CSS for a setting, clamped to the face's ranges (wght 100-900, wdth 50-200, slnt -10-0, CTRS 0-85). */
function fvs(a: KtAxes): string {
  return `"wght" ${clamp(a.wght, 100, 900).toFixed(1)}, "wdth" ${clamp(a.wdth, 50, 200).toFixed(2)}, "slnt" ${clamp(a.slnt, -10, 0).toFixed(2)}, "CTRS" ${clamp(a.CTRS, 0, 85).toFixed(1)}`;
}

/** What a part knows about one letter when it sets its target. */
export type KtLetter = {
  /** Its line, its place in that line, and the line's letter count. */
  line: number;
  i: number;
  n: number;
  /** Its place across the whole part. */
  k: number;
  /** Its centre in the part's own pixels, as last laid out, and its line's font size. */
  x: number;
  y: number;
  size: number;
  /** The width offset its flush line adds to every letter, wdth units (0 for a free line). */
  o: number;
  /** Whatever the part stamped on it (data-kt-tag). */
  tag: string;
};

/** The frame a target is set in. */
export type KtFrame = {
  now: number;
  dt: number;
  /** The pointer in the part's pixels, or null when it is away. */
  px: number | null;
  py: number | null;
  /** Smoothed horizontal pointer speed, px/s. */
  vx: number;
  w: number;
  h: number;
};

/** A letter's goal: a setting, how far it is under load (0-1, ink to accent), and its opacity. */
export type KtTarget = { a: KtAxes; load?: number; op?: number };

export type KtSpec = {
  /** The resting setting: flush lines are sized at it. */
  rest: (l: KtLetter) => KtAxes;
  /** The goal this frame; null rests. */
  target?: (l: KtLetter, f: KtFrame) => KtTarget | null;
  /** Where a letter seen for the first time starts (an entrance). Defaults to rest. */
  enter?: (l: KtLetter) => KtTarget;
  ink: string;
  accent: string;
  /** Keep the loop awake though nothing is settling (a pointer inside, a scroll-linked part). */
  busy?: (f: KtFrame) => boolean;
  /** Called once a frame after the letters are written (a readout). */
  onFrame?: (f: KtFrame) => void;
};

type KtState = { cur: KtAxes; vel: KtAxes; load: number; lv: number; op: number; ov: number; out: string; col: string; opa: string };

type KtLineState = {
  box: HTMLElement;
  run: HTMLElement;
  flush: boolean;
  group: string;
  max: number;
  letters: HTMLElement[];
  metas: KtLetter[];
  /** Width offset added to every letter (wdth units); the size it should have and the size it shows (eased when text changes); a size factor for when width alone can't reach; px per wdth unit at 100px. */
  o: number;
  size: number;
  s: number;
  z: number;
  k: number;
  /** Letter-spacing in px, the last resort for a line that is short even at the widest setting. */
  sp: number;
  lo: number;
  hi: number;
  T: number;
  W: number;
};

// Springs with mass: stiffness 220, damping 24 (a slight overshoot, settled in ~400ms).
const K_SPRING = 220;

const C_SPRING = 24;

const AXIS_KEYS = ["wght", "wdth", "slnt", "CTRS"] as const;

function springTo(s: KtState, t: KtTarget, dt: number, still: boolean): boolean {
  const load = t.load ?? 0;
  const op = t.op ?? 1;
  if (still) {
    s.cur = { ...t.a };
    s.vel = ax(0, 0);
    s.load = load;
    s.op = op;
    return false;
  }
  let moving = false;
  const steps = dt > 1 / 60 ? 2 : 1;
  const h = dt / steps;
  for (let n = 0; n < steps; n++) {
    for (const key of AXIS_KEYS) {
      const x = s.cur[key];
      const v = s.vel[key] + (K_SPRING * (t.a[key] - x) - C_SPRING * s.vel[key]) * h;
      s.vel[key] = v;
      s.cur[key] = x + v * h;
    }
    s.lv += (K_SPRING * (load - s.load) - C_SPRING * s.lv) * h;
    s.load += s.lv * h;
    s.ov += (K_SPRING * (op - s.op) - C_SPRING * s.ov) * h;
    s.op += s.ov * h;
  }
  for (const key of AXIS_KEYS) if (Math.abs(t.a[key] - s.cur[key]) > 0.3 || Math.abs(s.vel[key]) > 0.6) moving = true;
  if (Math.abs(load - s.load) > 0.004 || Math.abs(op - s.op) > 0.004) moving = true;
  return moving;
}

/**
 * The kit's engine. Every letter under the host (a span with data-kt-g inside
 * a line with data-kt-line) springs toward the setting its part asks for,
 * frame by frame; a line marked "flush" is kept exactly as wide as its box by
 * solving one width offset for all its letters (and, only when width alone
 * can't reach, its size). Each frame writes every letter first and then reads
 * every width and position once, so one layout serves the whole part. It
 * sleeps when everything has settled and wakes on input, resize or new fonts,
 * and only runs while the host is near the screen.
 */
function useKinetic(hostRef: RefObject<HTMLElement | null>, spec: KtSpec, key: string) {
  const specRef = useRef(spec);
  useEffect(() => {
    specRef.current = spec;
  });
  const reduced = useReducedMotion();
  const wakeRef = useRef<() => void>(() => {});
  const rescanRef = useRef<() => void>(() => {});
  const syncRef = useRef<() => void>(() => {});
  const [wake] = useState(() => () => wakeRef.current());

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let alive = true;
    const states = new WeakMap<HTMLElement, KtState>();
    let lines: KtLineState[] = [];
    let raf = 0;
    let last = 0;
    let visible = false;
    let px: number | null = null;
    let py: number | null = null;
    let vx = 0;
    let lastX = 0;
    let lastT = 0;
    let rect = host.getBoundingClientRect();
    let scale = 1;

    const mine = (el: Element) => el.closest("[data-kt-host]") === host;

    // Under reduced motion the pointer is ignored; discrete states still apply, without travel.
    const frameOf = (now: number, dt: number): KtFrame => ({
      now,
      dt,
      px: reduced ? null : px,
      py: reduced ? null : py,
      vx: reduced ? 0 : vx,
      w: rect.width / scale,
      h: rect.height / scale,
    });

    const targetOf = (m: KtLetter, f: KtFrame): KtTarget => {
      const sp = specRef.current;
      return sp.target?.(m, f) ?? { a: sp.rest(m) };
    };

    const readPositions = () => {
      rect = host.getBoundingClientRect();
      scale = rect.width / (host.offsetWidth || 1) || 1;
      for (const L of lines) {
        const fsz = L.flush ? L.s * L.z : parseFloat(getComputedStyle(L.box).fontSize) || 16;
        for (let i = 0; i < L.letters.length; i++) {
          const r = L.letters[i].getBoundingClientRect();
          const m = L.metas[i];
          m.x = (r.left + r.width / 2 - rect.left) / scale;
          m.y = (r.top + r.height / 2 - rect.top) / scale;
          m.size = fsz;
          m.o = L.flush ? L.o : 0;
        }
        if (L.flush) {
          L.W = L.run.getBoundingClientRect().width - L.sp * scale;
          L.T = L.box.getBoundingClientRect().width;
        }
      }
    };

    const scan = () => {
      const prev = lines;
      let k = 0;
      lines = Array.from(host.querySelectorAll<HTMLElement>("[data-kt-line]"))
        .filter(mine)
        .map((box, li) => {
          const run = box.querySelector<HTMLElement>("[data-kt-run]") ?? box;
          const letters = Array.from(run.querySelectorAll<HTMLElement>("[data-kt-g]")).filter(mine);
          const old = prev.find((p) => p.box === box);
          const metas = letters.map((el, i) => ({ line: li, i, n: letters.length, k: k++, x: 0, y: 0, size: 16, o: 0, tag: el.dataset.ktTag ?? "" }));
          if (old) {
            old.letters.forEach((el, i) => {
              const j = letters.indexOf(el);
              if (j >= 0) {
                metas[j].x = old.metas[i].x;
                metas[j].y = old.metas[i].y;
                metas[j].size = old.metas[i].size;
              }
            });
          }
          return {
            box,
            run,
            flush: box.dataset.ktLine === "flush",
            group: box.dataset.ktGroup ?? "",
            max: Number(box.dataset.ktMax) || 1e6,
            letters,
            metas,
            o: old?.o ?? 0,
            size: old?.size ?? 0,
            s: old?.s ?? 0,
            z: old?.z ?? 1,
            sp: old?.sp ?? 0,
            k: old?.k ?? 0,
            lo: old?.lo ?? -50,
            hi: old?.hi ?? 100,
            T: 0,
            W: 0,
          };
        });
      const sp = specRef.current;
      const f = frameOf(performance.now(), 0);
      for (const L of lines) {
        L.letters.forEach((el, i) => {
          if (states.has(el)) return;
          const m = L.metas[i];
          const t = reduced ? targetOf(m, f) : (sp.enter?.(m) ?? targetOf(m, f));
          states.set(el, { cur: { ...t.a }, vel: ax(0, 0), load: t.load ?? 0, lv: 0, op: t.op ?? 1, ov: 0, out: "", col: "", opa: "" });
        });
      }
    };

    const writeAll = () => {
      const sp = specRef.current;
      for (const L of lines) {
        for (const el of L.letters) {
          const s = states.get(el);
          if (!s) continue;
          const out = fvs(L.flush ? { ...s.cur, wdth: s.cur.wdth + L.o } : s.cur);
          if (out !== s.out) {
            el.style.fontVariationSettings = out;
            s.out = out;
          }
          const col = s.load > 0.004 ? mixHex(sp.ink, sp.accent, s.load) : "";
          if (col !== s.col) {
            el.style.color = col;
            s.col = col;
          }
          const opa = s.op < 0.996 ? clamp(s.op, 0, 1).toFixed(3) : "";
          if (opa !== s.opa) {
            el.style.opacity = opa;
            s.opa = opa;
          }
        }
        if (L.flush) {
          const fs = `${(L.s * L.z).toFixed(2)}px`;
          if (L.box.style.fontSize !== fs) L.box.style.fontSize = fs;
          const ls = L.sp > 0.05 ? `${L.sp.toFixed(2)}px` : "";
          if (L.run.style.letterSpacing !== ls) {
            L.run.style.letterSpacing = ls;
            L.run.style.marginRight = ls ? `-${ls}` : "";
          }
        }
      }
    };

    // Sizes every flush line from two measurements at its rest setting and 100px, with no offset
    // and with +20 wdth: that gives its width, its px per wdth unit, and so its size and offset.
    const size = () => {
      const sp = specRef.current;
      rect = host.getBoundingClientRect();
      scale = rect.width / (host.offsetWidth || 1) || 1;
      const flush = lines.filter((L) => L.flush && L.letters.length);
      if (flush.length) {
        const rests = flush.map((L) => L.metas.map((m) => sp.rest(m)));
        flush.forEach((L) => {
          L.sp = 0;
          L.run.style.letterSpacing = "";
          L.run.style.marginRight = "";
        });
        const write = (d: number) =>
          flush.forEach((L, li) => {
            L.box.style.fontSize = "100px";
            L.letters.forEach((el, i) => {
              el.style.fontVariationSettings = fvs({ ...rests[li][i], wdth: rests[li][i].wdth + d });
            });
          });
        write(0);
        const T = flush.map((L) => L.box.getBoundingClientRect().width);
        const w0 = flush.map((L) => L.run.getBoundingClientRect().width);
        write(20);
        const w1 = flush.map((L) => L.run.getBoundingClientRect().width);
        flush.forEach((L) => {
          L.max = Number(L.box.dataset.ktMax) || 1e6;
        });
        const want = flush.map((L, i) => Math.min(L.max, (100 * T[i]) / Math.max(1, w0[i])));
        const groups = new Map<string, number>();
        flush.forEach((L, i) => {
          if (L.group) groups.set(L.group, Math.min(groups.get(L.group) ?? 1e6, want[i]));
        });
        flush.forEach((L, i) => {
          const s = Math.max(6, L.group ? (groups.get(L.group) ?? want[i]) : want[i]);
          const k100 = (w1[i] - w0[i]) / 20;
          const widths = rests[i].map((a) => a.wdth);
          L.lo = 50 - Math.max(...widths);
          L.hi = 200 - Math.min(...widths);
          L.size = s;
          // New text eases to its new size (the width solve keeps it flush meanwhile); a first sizing is immediate.
          if (!L.s || reduced) L.s = s;
          // A face without a width axis measures the same twice: then only the size can fit the line.
          L.k = k100 > 0.0005 * w0[i] ? k100 : 0;
          if (L.k > 0) {
            L.o = clamp(((100 * T[i]) / s - w0[i]) / k100, L.lo, L.hi);
            const w = (s / 100) * (w0[i] + k100 * L.o);
            L.z = clamp(T[i] / Math.max(1, w), 0.5, 1);
            // Still short at the widest setting: spread what is left between the letters.
            if (T[i] > w) L.sp = (T[i] - w) / scale / Math.max(1, L.letters.length - 1);
          } else {
            L.o = 0;
            L.z = clamp(T[i] / Math.max(1, (s / 100) * w0[i]), 0.3, 3);
          }
          L.letters.forEach((el) => {
            const st = states.get(el);
            if (st) st.out = "";
          });
        });
      }
      writeAll();
      readPositions();
    };

    // One step of the width solve per frame, a little under-relaxed; the size moves only when width is pinned.
    const solve = (): boolean => {
      let fitting = false;
      for (const L of lines) {
        if (!L.flush || L.T <= 0 || L.W <= 0) continue;
        const err = L.T - L.W;
        if (Math.abs(err) <= Math.max(0.6, L.T * 0.0006)) {
          if (L.z !== 1 && L.k > 0 && L.o > L.lo + 1 && L.o < L.hi - 1) {
            L.z += (1 - L.z) * 0.2;
            if (Math.abs(L.z - 1) < 0.002) L.z = 1;
            fitting = true;
          }
          continue;
        }
        fitting = true;
        if (L.k > 0) {
          const pinnedWide = L.o >= L.hi - 0.01;
          if (pinnedWide && err > 0) {
            L.sp += (0.85 * err) / scale / Math.max(1, L.letters.length - 1);
            continue;
          }
          if (L.sp > 0 && err < 0) {
            L.sp = Math.max(0, L.sp + (0.85 * err) / scale / Math.max(1, L.letters.length - 1));
            continue;
          }
          const next = clamp(L.o + (0.85 * err) / ((L.k * L.s * L.z) / 100), L.lo, L.hi);
          // Pinned at the axis limit: the size may shrink a line that would overflow, never grow one (a short line just stays short).
          if (next === L.lo || next === L.hi) L.z = clamp(L.z * (1 + (0.6 * err) / L.W), 0.5, 1);
          L.o = next;
        } else {
          L.z = clamp(L.z * (1 + (0.6 * err) / L.W), 0.3, 3);
        }
      }
      return fitting;
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
      last = now;
      vx *= Math.exp(-dt * 6);
      const sp = specRef.current;
      const f = frameOf(now, dt);
      let moving = false;
      for (const L of lines) {
        // The offset may take the widest letter down to 50 or the narrowest up to 200: the range follows the letters' current settings.
        if (L.flush && L.letters.length) {
          let lo = 200;
          let hi = 50;
          for (const el of L.letters) {
            const st = states.get(el);
            if (!st) continue;
            if (st.cur.wdth < lo) lo = st.cur.wdth;
            if (st.cur.wdth > hi) hi = st.cur.wdth;
          }
          L.lo = 50 - hi;
          L.hi = 200 - lo;
        }
        if (L.flush && L.s !== L.size) {
          L.s += (L.size - L.s) * (1 - Math.exp(-dt * 14));
          if (Math.abs(L.s - L.size) < 0.05) L.s = L.size;
          moving = true;
        }
        L.letters.forEach((el, i) => {
          const s = states.get(el);
          if (s && springTo(s, targetOf(L.metas[i], f), dt, reduced)) moving = true;
        });
      }
      writeAll();
      readPositions();
      const fitting = solve();
      sp.onFrame?.(f);
      const busy = !reduced && (sp.busy?.(f) ?? false);
      if ((moving || fitting || busy) && visible && !document.hidden) raf = requestAnimationFrame(tick);
      else last = 0;
    };

    const kick = () => {
      if (alive && !raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
    };
    wakeRef.current = kick;
    rescanRef.current = () => {
      scan();
      size();
      kick();
    };
    // A render may have written a letter's resting style over the engine's: write everything again.
    syncRef.current = () => {
      for (const L of lines) {
        for (const el of L.letters) {
          const st = states.get(el);
          if (st) {
            st.out = "";
            st.col = "";
            st.opa = "";
          }
        }
      }
      writeAll();
    };

    const toLocal = (e: PointerEvent) => {
      rect = host.getBoundingClientRect();
      scale = rect.width / (host.offsetWidth || 1) || 1;
      const x = (e.clientX - rect.left) / scale;
      const t = performance.now();
      if (px !== null && t > lastT) vx = vx * 0.7 + ((x - lastX) / (t - lastT)) * 1000 * 0.3;
      lastX = x;
      lastT = t;
      px = x;
      py = (e.clientY - rect.top) / scale;
      kick();
    };
    const onLeave = () => {
      px = null;
      py = null;
      kick();
    };
    // A finger lifted is a pointer gone; a mouse stays until it leaves.
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") onLeave();
    };
    host.addEventListener("pointermove", toLocal);
    host.addEventListener("pointerdown", toLocal);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointercancel", onLeave);

    const refit = () => {
      if (!alive) return;
      size();
      kick();
    };
    const ro = new ResizeObserver(refit);
    ro.observe(host);
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        kick();
      },
      { rootMargin: "120px" },
    );
    io.observe(host);
    const fonts = document.fonts;
    fonts?.addEventListener?.("loadingdone", refit);
    fonts?.ready.then(refit);
    const onVis = () => kick();
    document.addEventListener("visibilitychange", onVis);

    scan();
    size();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      wakeRef.current = () => {};
      rescanRef.current = () => {};
      syncRef.current = () => {};
      host.removeEventListener("pointermove", toLocal);
      host.removeEventListener("pointerdown", toLocal);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointercancel", onLeave);
      ro.disconnect();
      io.disconnect();
      fonts?.removeEventListener?.("loadingdone", refit);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [hostRef, reduced]);

  // New letters or new text: find them, size the flush lines again, and let the springs run.
  useEffect(() => {
    rescanRef.current();
  }, [key]);

  // After every render: React owns each letter's first style, the engine owns every one after.
  useEffect(() => {
    syncRef.current();
  });

  return wake;
}

/** Splits text into letters (spaces kept as non-breaking, so a flush line never wraps). */
function lettersOf(text: string): string[] {
  return Array.from(text).map((ch) => (ch === " " ? "\u00a0" : ch));
}

/**
 * One line of letters for the engine. `flush` sets it exactly as wide as its
 * box; lines in the same `group` share one size, so they stand at one cap
 * height and differ only in width. The letters are aria-hidden: name the
 * line on its parent (an h1's aria-label, a button's text).
 */
function KtLine({
  text,
  rest,
  flush = false,
  group,
  max,
  tag,
  className,
  style,
}: {
  text: string;
  rest: KtAxes | ((i: number) => KtAxes);
  flush?: boolean;
  group?: string;
  /** Largest size a flush line may take, px. */
  max?: number;
  tag?: (i: number) => string;
  /** Classes on the line; give a flush line its first size here (for example "text-[18cqw]"), the engine then sets it in px. */
  className?: string;
  style?: CSSProperties;
}) {
  const letters = lettersOf(text);
  const glyph = (ch: string, i: number) => (
    <span key={i} data-kt-g="" data-kt-tag={tag?.(i)} className="inline-block whitespace-pre" style={{ fontVariationSettings: fvs(typeof rest === "function" ? rest(i) : rest) }}>
      {ch}
    </span>
  );
  // A free line may wrap, but only between words: each word is one unbreakable run of letters.
  const words: ReactNode[] = [];
  if (!flush) {
    let i = 0;
    text.split(" ").forEach((word, w) => {
      if (w > 0) {
        words.push(" ");
        i++;
      }
      const start = i;
      words.push(
        <span key={"w" + w} className="inline-block whitespace-nowrap">
          {Array.from(word).map((ch, j) => glyph(ch, start + j))}
        </span>,
      );
      i += Array.from(word).length;
    });
  }
  return (
    <span
      data-kt-line={flush ? "flush" : "free"}
      data-kt-group={group}
      data-kt-max={max}
      className={(flush ? "block whitespace-nowrap " : "") + (className ?? "")}
      style={{ fontFamily: DISPLAY, ...style }}
    >
      <span data-kt-run="" aria-hidden className={flush ? "inline-block" : undefined}>
        {flush ? letters.map(glyph) : words}
      </span>
    </span>
  );
}

const SCRUB_BEFORE = ax(110, 64, 0);

const SCRUB_PEAK = ax(900, 168, 82);

const SCRUB_AFTER = ax(600, 100, 16);

function smooth01(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/** The heading's state at a phase: a hairline before, the loud peak in the middle, the set identity after. */
function scrubAt(q: number): { a: KtAxes; load: number } {
  const e = smooth01(q);
  const a = e < 0.5 ? mixAxes(SCRUB_BEFORE, SCRUB_PEAK, e * 2) : mixAxes(SCRUB_PEAK, SCRUB_AFTER, (e - 0.5) * 2);
  return { a, load: Math.max(0, 1 - Math.abs(e - 0.5) * 2.4) };
}

export type AxisScrubHeadingProps = {
  /** The heading, one entry per line. */
  lines: string[];
  as?: "h1" | "h2" | "h3" | "p";
  /** Every line exactly as wide as the heading's box (the width axis takes up the difference). */
  flush?: boolean;
  /** Where the wave is, 0-1, instead of the heading's place on the screen. */
  progress?: number;
  palette?: KtPaletteName;
  tone?: KtTone;
  className?: string;
  style?: CSSProperties;
};

/**
 * A heading set by its place on the screen. As it rises through the view a
 * wave passes through it from the first letter to the last: each letter goes
 * from a condensed hairline to a heavy, wide, high-contrast peak in the
 * accent and settles into its set identity, so scrolling reads as the words
 * being written. Scroll back and it unwrites; the scroll position is the
 * state, so it never runs ahead of the reader. Flush lines stay exactly as
 * wide as the box throughout. Reduced motion shows it set.
 */
export function AxisScrubHeading({ lines, as = "h2", flush = true, progress, palette = "cobalt", tone = "paper", className, style }: AxisScrubHeadingProps) {
  const t = toneOf(tone);
  const reduced = useReducedMotion();
  const scrollRoot = useContext(ScrollRootContext);
  const hostRef = useRef<HTMLDivElement>(null);
  const place = useRef(0.5);
  const total = lines.reduce((n, l) => n + Array.from(l).length, 0);
  const wake = useKinetic(
    hostRef,
    {
      rest: () => SCRUB_AFTER,
      target: (l) => {
        if (reduced) return { a: SCRUB_AFTER };
        const q = progress ?? place.current;
        // Each letter's own phase: the wave crosses the heading in the middle 60% of the travel.
        return scrubAt(q * 2.2 - 0.6 - (l.k / Math.max(1, total)) * 0.6);
      },
      ink: t.ink,
      accent: accentOf(palette, tone),
    },
    lines.join("/"),
  );

  useEffect(() => {
    wake();
  }, [progress, wake]);

  // The place on the screen: 0 as the heading enters at the bottom, 1 as it leaves at the top.
  useEffect(() => {
    if (progress !== undefined) return;
    const root = scrollRoot?.current ?? null;
    const target: HTMLElement | Window = root ?? window;
    const onScroll = () => {
      const el = hostRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const top = root ? root.getBoundingClientRect().top : 0;
      const h = root ? root.clientHeight : window.innerHeight;
      const v = clamp(1 - (r.top + r.height / 2 - top) / Math.max(1, h), 0, 1);
      if (Math.abs(v - place.current) > 0.001) {
        place.current = v;
        wake();
      }
    };
    onScroll();
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [progress, scrollRoot, wake]);

  const Tag = as;
  return (
    <div ref={hostRef} data-kt-host="" className={"@container " + (className ?? "")} style={{ color: t.ink, ...style }}>
      <Tag aria-label={lines.join(" ")} className="m-0 font-normal uppercase" style={{ lineHeight: 0.86 }}>
        {lines.map((line, i) => (
          <KtLine key={i} text={line} rest={SCRUB_AFTER} flush={flush} group="scrub" className={flush ? "text-[10cqw]" : "block whitespace-nowrap"} />
        ))}
      </Tag>
    </div>
  );
}
