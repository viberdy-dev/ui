"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";

/**
 * AsciiResolveHeading — a heading that resolves from ASCII into type.
 *
 * The heading's own letterforms are rasterised and redrawn in the page's
 * mono face, glyph by glyph, matched to the shape of each cell. On view it
 * steps from coarse glyphs to fine and lands on the crisp heading in about
 * 900ms; afterwards a lens under the pointer shows the glyphs underneath.
 * Real text, named once; crisp until it can animate. The default size reads
 * the nearest @container (7cqw) and falls back to the viewport.
 *
 * Part of the Dither & ASCII kit: one ink, paper #f3f0e6, on a warm black
 * ground #0b0b0d, with vermillion #ff4f2b as a second ink inside the
 * pictures and for a live state. Cells snap to whole device pixels;
 * scenes dither in linear light, photographs on a gentler curve. Funnel Display through
 * var(--font-funnel) for display over Geist; Geist Mono for every glyph.
 * Respects prefers-reduced-motion. No dependencies beyond React.
 * Paste it as its own file: it repeats the kit's small helpers, which would
 * clash in one module. Load Funnel Display with next/font (variable:
 * "--font-funnel") on a parent, or from Google Fonts or @fontsource.
 */

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

const DISPLAY = 'var(--font-funnel, "Funnel Display", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** One ink on a warm black ground, and one signal colour. */
const SHEET = {
  ground: "#0b0b0d",
  panel: "#121214",
  raised: "#19191c",
  paper: "#f3f0e6",
  ink: "rgba(243,240,230,0.92)",
  ink2: "rgba(243,240,230,0.6)",
  ink3: "rgba(243,240,230,0.38)",
  line: "rgba(243,240,230,0.08)",
  line2: "rgba(243,240,230,0.16)",
  signal: "#ff4f2b",
} as const;

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

/**
 * The glyph atlas for ASCII: the 95 printable characters of the mono face,
 * drawn once into cells of the stage's glyph size, and each glyph's coverage
 * in six regions (two across, three down), normalised so the densest region
 * of any glyph is 1. The shader matches cells against these.
 */
function daAtlas(family: string, fontPx: number): { canvas: HTMLCanvasElement; sig: Uint8Array; n: number; cw: number; ch: number } {
  const n = 95;
  const probe = document.createElement("canvas").getContext("2d");
  const font = `${fontPx}px ${family}`;
  let adv = fontPx * 0.6;
  if (probe) {
    probe.font = font;
    adv = probe.measureText("0").width || adv;
  }
  const cw = Math.max(3, Math.round(adv));
  const ch = Math.max(5, Math.round(fontPx * 1.3));
  const canvas = document.createElement("canvas");
  canvas.width = cw * n;
  canvas.height = ch;
  const x = canvas.getContext("2d", { willReadFrequently: true });
  const sig = new Uint8Array(n * 2 * 4);
  if (!x) return { canvas, sig, n, cw, ch };
  x.fillStyle = "#000";
  x.fillRect(0, 0, canvas.width, canvas.height);
  x.fillStyle = "#fff";
  x.font = font;
  x.textAlign = "center";
  x.textBaseline = "middle";
  for (let i = 0; i < n; i++) x.fillText(String.fromCharCode(32 + i), i * cw + cw / 2, ch / 2 + fontPx * 0.04);
  const data = x.getImageData(0, 0, canvas.width, canvas.height).data;
  const raw = new Float32Array(n * 6);
  let mx = 0;
  for (let g = 0; g < n; g++) {
    for (let r = 0; r < 3; r++) {
      for (let q = 0; q < 2; q++) {
        const x0 = g * cw + Math.floor((q * cw) / 2);
        const x1 = g * cw + Math.floor(((q + 1) * cw) / 2);
        const y0 = Math.floor((r * ch) / 3);
        const y1 = Math.floor(((r + 1) * ch) / 3);
        let s = 0;
        for (let y = y0; y < y1; y++) for (let xx = x0; xx < x1; xx++) s += data[(y * canvas.width + xx) * 4];
        const v = s / Math.max(1, (x1 - x0) * (y1 - y0) * 255);
        raw[g * 6 + r * 2 + q] = v;
        mx = Math.max(mx, v);
      }
    }
  }
  for (let g = 0; g < n; g++) {
    for (let k = 0; k < 6; k++) {
      const row = k < 3 ? 0 : 1;
      const col = k % 3;
      sig[(row * n + g) * 4 + col] = Math.round((raw[g * 6 + k] / (mx || 1)) * 255);
    }
    sig[g * 4 + 3] = 255;
    sig[(n + g) * 4 + 3] = 255;
  }
  return { canvas, sig, n, cw, ch };
}

/**
 * Sets a raster (alpha 0-255, `w` x `h`) as ASCII at one glyph size: each
 * cell's coverage in six regions is sharpened and matched against the glyph
 * signatures of the mono face. Returns the lines and the cell size.
 */
function daAsciiOf(alpha: Uint8ClampedArray, w: number, h: number, family: string, fontPx: number): { text: string; cw: number; ch: number; adv: number } {
  const a = daAtlas(family, fontPx);
  const n = a.n;
  const sig: number[][] = [];
  for (let g = 0; g < n; g++) {
    const v: number[] = [];
    for (let k = 0; k < 6; k++) v.push(a.sig[((k < 3 ? 0 : 1) * n + g) * 4 + (k % 3)] / 255);
    sig.push(v);
  }
  const probe = document.createElement("canvas").getContext("2d");
  let adv = a.cw;
  if (probe) {
    probe.font = `${fontPx}px ${family}`;
    adv = probe.measureText("0").width || adv;
  }
  const cols = Math.ceil(w / a.cw);
  const rows = Math.ceil(h / a.ch);
  const out: string[] = [];
  const v = [0, 0, 0, 0, 0, 0];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      let mx = 0;
      for (let k = 0; k < 6; k++) {
        const x0 = Math.floor(c * a.cw + ((k % 2) * a.cw) / 2);
        const x1 = Math.floor(c * a.cw + (((k % 2) + 1) * a.cw) / 2);
        const y0 = Math.floor(r * a.ch + (Math.floor(k / 2) * a.ch) / 3);
        const y1 = Math.floor(r * a.ch + ((Math.floor(k / 2) + 1) * a.ch) / 3);
        let s = 0;
        let m = 0;
        for (let y = y0; y < Math.min(y1, h); y += 1) {
          for (let x = x0; x < Math.min(x1, w); x += 1) {
            s += alpha[(y * w + x) * 4 + 3];
            m++;
          }
        }
        v[k] = m ? s / (m * 255) : 0;
        mx = Math.max(mx, v[k]);
      }
      if (mx < 0.02) {
        line += " ";
        continue;
      }
      for (let k = 0; k < 6; k++) v[k] = Math.pow(v[k] / mx, 1.6) * mx;
      let best = Infinity;
      let bi = 0;
      for (let g = 0; g < n; g++) {
        const s = sig[g];
        let d = 0;
        for (let k = 0; k < 6; k++) d += (s[k] - v[k]) * (s[k] - v[k]);
        if (d < best) {
          best = d;
          bi = g;
        }
      }
      line += String.fromCharCode(32 + bi);
    }
    out.push(line.replace(/\s+$/, ""));
  }
  return { text: out.join("\n"), cw: a.cw, ch: a.ch, adv };
}

type DaLevel = { text: string; cw: number; ch: number; adv: number; px: number };

/** Writes one glyph level into a pre, sized so each glyph lands on its cell. */
function daShowLevel(el: HTMLPreElement | null, L: DaLevel | undefined) {
  if (!el || !L) return;
  el.textContent = L.text;
  el.style.fontSize = `${L.px}px`;
  el.style.lineHeight = `${L.ch}px`;
  el.style.letterSpacing = `${L.cw - L.adv}px`;
}

/**
 * AsciiResolveHeading — a heading that resolves from ASCII into type.
 *
 * The heading's own letterforms are rasterised and redrawn in the page's
 * mono face, glyph by glyph, matched to the shape of each cell. When it
 * comes into view it steps from coarse glyphs to fine ones and lands on the
 * crisp heading in about 900ms. Afterwards a lens follows the pointer across
 * it and shows the finest glyphs underneath. The heading is real text named
 * once for screen readers; it renders crisp first and only turns to glyphs
 * once it can animate. A `progress` prop (0-1) drives it by hand. Its
 * default size, clamp(40px, 7cqw, 92px), reads the nearest @container and
 * falls back to the viewport; pass fontSize in `style` to set your own.
 */
export function AsciiResolveHeading({
  lines = "Any image. / Any output.",
  as = "h2",
  glyph = 7,
  lens = true,
  progress,
  className = "",
  style,
}: {
  /** "/" breaks a line. */
  lines?: string;
  as?: "h1" | "h2" | "h3";
  /** The finest glyph size, in CSS pixels. */
  glyph?: number;
  /** A lens that shows the glyphs under the pointer once resolved. */
  lens?: boolean;
  /** 0 = coarsest glyphs, 1 = crisp; drives it by hand instead of on view. */
  progress?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const Tag = as;
  const parts = lines.split("/").map((l) => l.trim()).filter(Boolean);
  const label = parts.join(" ");
  const hostRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lensRef = useRef<HTMLPreElement>(null);
  const reduced = useReducedMotion();
  const levels = useRef<DaLevel[]>([]);
  const [phase, setPhase] = useState<"static" | "armed" | "resolving" | "done">("static");
  const [version, setVersion] = useState(0);
  const ready = version > 0;
  const driven = progress !== undefined;

  // Rasterise the heading as laid out and set it at four glyph sizes, coarse to fine.
  useEffect(() => {
    const host = hostRef.current;
    const text = textRef.current;
    if (!host || !text) return;
    let alive = true;
    const build = () => {
      if (!alive) return;
      const w = Math.ceil(text.offsetWidth);
      const h = Math.ceil(text.offsetHeight);
      if (w < 4 || h < 4) return;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d", { willReadFrequently: true });
      if (!x) return;
      const cs = getComputedStyle(text);
      x.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      (x as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
      x.textBaseline = "middle";
      x.fillStyle = "#fff";
      const box = text.getBoundingClientRect();
      const k = text.offsetWidth ? box.width / text.offsetWidth : 1;
      for (const span of Array.from(text.children) as HTMLElement[]) {
        const r = span.getBoundingClientRect();
        x.fillText(span.textContent ?? "", (r.left - box.left) / k, (r.top - box.top + r.height / 2) / k);
      }
      const data = x.getImageData(0, 0, w, h).data;
      text.style.fontFamily = MONO;
      const mono = getComputedStyle(text).fontFamily || "monospace";
      text.style.fontFamily = "";
      const sizes = [glyph * 3.4, glyph * 2.3, glyph * 1.5, glyph];
      levels.current = sizes.map((px) => ({ ...daAsciiOf(data, w, h, mono, px), px }));
      setVersion((n) => n + 1);
    };
    const ro = new ResizeObserver(() => build());
    ro.observe(text);
    document.fonts?.ready.then(() => build());
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [glyph, lines]);


  // On view: arm (glyphs, text hidden), then step coarse to fine and land on the type.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !ready || driven || reduced) return;
    let stage = "static";
    const timers: number[] = [];
    const raf = requestAnimationFrame(() => {
      if (stage !== "static") return;
      stage = "armed";
      daShowLevel(preRef.current, levels.current[0]);
      setPhase("armed");
    });
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || stage === "resolving") return;
        io.disconnect();
        if (stage === "static") daShowLevel(preRef.current, levels.current[0]);
        stage = "resolving";
        setPhase("resolving");
        [1, 2, 3].forEach((i, n) => timers.push(window.setTimeout(() => daShowLevel(preRef.current, levels.current[i]), 150 * (n + 1))));
        timers.push(window.setTimeout(() => setPhase("done"), 620));
      },
      { threshold: 0.45 },
    );
    io.observe(host);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      timers.forEach((t) => clearTimeout(t));
    };
  }, [ready, driven, reduced]);

  // Driven by hand: the level follows the prop.
  useEffect(() => {
    if (progress === undefined || !ready) return;
    const i = Math.min(3, Math.floor(clamp(progress, 0, 1) * 4.999));
    if (progress < 0.96) daShowLevel(preRef.current, levels.current[i]);
  }, [progress, ready, version]);

  // The lens: the finest glyphs under the pointer, the type masked away there.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !lens || !ready) return;
    daShowLevel(lensRef.current, levels.current[3]);
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const k = host.offsetWidth ? r.width / host.offsetWidth : 1;
      host.style.setProperty("--da-lx", `${(e.clientX - r.left) / k}px`);
      host.style.setProperty("--da-ly", `${(e.clientY - r.top) / k}px`);
      host.style.setProperty("--da-lr", "74px");
    };
    const leave = () => host.style.setProperty("--da-lr", "0px");
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, [lens, ready, version]);

  const crisp = driven ? clamp(progress, 0, 1) >= 0.96 : phase === "static" || phase === "done";
  const glyphs = driven ? !crisp : phase === "armed" || phase === "resolving";
  const lensOn = lens && ready && crisp;
  const hole = "radial-gradient(circle var(--da-lr, 0px) at var(--da-lx, 50%) var(--da-ly, 50%), transparent 97%, #000 100%)";
  const spot = "radial-gradient(circle var(--da-lr, 0px) at var(--da-lx, 50%) var(--da-ly, 50%), #000 97%, transparent 100%)";

  return (
    <Tag
      ref={hostRef}
      aria-label={label}
      className={"relative m-0 font-bold leading-[0.96] " + className}
      style={{ fontFamily: DISPLAY, letterSpacing: "-0.035em", color: SHEET.paper, fontSize: "clamp(40px, 7cqw, 92px)", ...style }}
    >
      <span
        ref={textRef}
        aria-hidden
        className="block"
        style={{
          opacity: glyphs ? 0 : 1,
          transition: reduced ? "none" : `opacity 280ms ${EASE}`,
          maskImage: lensOn ? hole : undefined,
          WebkitMaskImage: lensOn ? hole : undefined,
        }}
      >
        {parts.map((p, i) => (
          <span key={i} className="block w-max max-w-full">
            {p}
          </span>
        ))}
      </span>
      <pre
        ref={preRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 m-0 overflow-hidden whitespace-pre"
        style={{ fontFamily: MONO, color: SHEET.paper, opacity: glyphs ? 1 : 0, transition: reduced ? "none" : `opacity 280ms ${EASE}`, letterSpacing: 0 }}
      />
      <pre
        ref={lensRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 m-0 overflow-hidden whitespace-pre"
        style={{ fontFamily: MONO, color: SHEET.paper, opacity: lensOn ? 1 : 0, maskImage: spot, WebkitMaskImage: spot }}
      />
    </Tag>
  );
}
