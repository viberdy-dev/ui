"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, PointerEvent as ReactPointerEvent } from "react";

/**
 * GlassTintFooter — a footer of liquid glass that rises over the section
 * above it as you scroll, with a liquid top edge and a tint borrowed from
 * that section.
 *
 * The footer is a thick glass slab. As it scrolls into view its top edge
 * climbs over the bottom of the previous section, tied to the scroll
 * position (scroll back and it sinks again), and in Chromium the refraction
 * along that edge ramps up from zero as it rises. The edge is a meniscus:
 * scroll fast and it sloshes, three slow springs that settle in under a
 * second and then sleep. The shape is the slab's own clip path with an SVG
 * rim drawn along it, so the edge moves in every engine.
 *
 * Its tint is not a fixed brand colour: it reads the section above (a
 * `data-glass-tint="#rrggbb"` attribute, or failing that its computed
 * background colour) and mixes it into the glass, strongest along the edge
 * and fading toward the bottom. Change that section and the footer re-tints
 * over 600ms. It reads its IMMEDIATE previous sibling, so place it directly
 * after that section; in development it warns when there is nothing to read.
 *
 * A light follows the pointer across the slab (and follows keyboard focus),
 * brightening the nearest stretch of rim. A small glass droplet glides
 * between the footer links on hover and focus, stretching as it travels; it
 * lights and slightly magnifies the link under it and never bends the text.
 *
 * Scrolling: by default it follows the page (window scroll). Inside a
 * fixed-height scroll box (a preview, a modal, a split pane), set
 * scroll="frame" and it follows its nearest scrolling ancestor instead.
 * Under prefers-reduced-motion the slab sits fully risen, the edge stays
 * still and the droplet moves without gliding. Everything sleeps when the
 * footer is off screen or at rest.
 *
 * Link columns, an optional newsletter capsule (you pass onSubscribe; it does
 * not post anywhere by itself), legal links and a note. Hrefs are sanitised.
 * The layout follows the footer's own width (container queries).
 *
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries
 * plugin). No dependencies beyond React.
 */

type Tone = "dark" | "light";
export type FooterLink = { label: string; href: string };
export type FooterColumn = { title: string; links: FooterLink[] };

/** Glass kept above the resting edge, px, so an upward swing is never cut flat. */
const PAD = 26;
/** The slab's top corners, px. */
const RADIUS = 28;
/** How far the meniscus swings at strength 1, px. */
const SWING = 12;
/** The meniscus: three standing waves, each a slow damped spring (Hz, damping ratio). */
const MODES = [
  { f: 1.3, z: 0.4 },
  { f: 2.0, z: 0.36 },
  { f: 2.8, z: 0.36 },
];
/** The droplet's padding around a link, px. */
const DROP_X = 9;
const DROP_Y = 4;

type Shared = {
  lens: number;
  lensOn: boolean;
  y0: number;
  kick: () => void;
  aim: (x: number, y: number) => void;
  rest: () => void;
  hover: (el: HTMLElement) => void;
  leave: () => void;
  focus: (el: HTMLElement) => void;
  blur: (to: Element | null) => void;
};
const noop = () => {};

/** Allow relative paths, fragments, http(s), mailto and tel; anything else becomes "#". */
function safeHref(href: string): string {
  const v = href.replace(/[\t\n\r]/g, "").trim();
  if (v.indexOf(String.fromCharCode(92)) !== -1) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#?]/.test(v) && !/^\/\//.test(v)) return v;
  return "#";
}

/** "#rrggbb" to "r,g,b", or null. Anything else is ignored, never interpolated. */
function rgbOf(hex?: string | null): string | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
}

/** "rgb(r, g, b)" or an opaque-enough "rgba(...)" to "r,g,b"; transparent gives null. */
function rgbFromComputed(color: string): string | null {
  const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)$/.exec(color);
  if (!m) return null;
  if (m[4] !== undefined && parseFloat(m[4]) < 0.2) return null;
  return m[1] + "," + m[2] + "," + m[3];
}

function isChromium(): boolean {
  const ua = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData;
  return !!ua && !!ua.brands && ua.brands.some((b) => /Chromium/.test(b.brand));
}

/** Smoothstep on 0..1. */
function ease(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** An element's box inside a positioned ancestor, in layout pixels (transforms ignored). */
function offsetIn(el: HTMLElement, box: HTMLElement) {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== box) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** The nearest ancestor that scrolls vertically, or null (the page). */
function scrollParent(el: HTMLElement): HTMLElement | null {
  let n = el.parentElement;
  while (n && n !== document.body && n !== document.documentElement) {
    const o = getComputedStyle(n).overflowY;
    if (o === "auto" || o === "scroll" || o === "overlay") return n;
    n = n.parentElement;
  }
  return null;
}

/**
 * A light that eases after the pointer (about 180ms) and fades when it
 * leaves (220ms). paint() gets layout pixels and an opacity; the loop sleeps
 * once the light arrives. aim() points it without a pointer (keyboard
 * focus); rest() lets it fade unless the pointer is still over the element.
 */
function followPointer(el: HTMLElement, paint: (x: number, y: number, o: number) => void) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const L = { x: 0, y: 0, tx: 0, ty: 0, o: 0, to: 0, raf: 0, last: 0, over: false };
  function step(now: number) {
    L.raf = 0;
    const dt = L.last ? Math.min(1 / 30, (now - L.last) / 1000) : 1 / 60;
    L.last = now;
    const kp = reduce.matches ? 1 : 1 - Math.exp(-dt / 0.18);
    const ko = reduce.matches ? 1 : 1 - Math.exp(-dt / 0.22);
    L.x += (L.tx - L.x) * kp;
    L.y += (L.ty - L.y) * kp;
    L.o += (L.to - L.o) * ko;
    paint(L.x, L.y, L.o);
    if (Math.abs(L.tx - L.x) > 0.3 || Math.abs(L.ty - L.y) > 0.3 || Math.abs(L.to - L.o) > 0.004) {
      L.raf = requestAnimationFrame(step);
    } else L.last = 0;
  }
  const kick = () => {
    if (!L.raf) L.raf = requestAnimationFrame(step);
  };
  function aim(x: number, y: number) {
    L.tx = x;
    L.ty = y;
    L.to = 1;
    // A light that is out starts where it is aimed, instead of streaking there.
    if (L.o < 0.02) {
      L.x = x;
      L.y = y;
    }
    kick();
  }
  function onMove(e: PointerEvent) {
    // Layout pixels, even inside a transform-scaled container.
    const r = el.getBoundingClientRect();
    const k = el.offsetWidth / (r.width || 1);
    L.over = true;
    aim((e.clientX - r.left) * k, (e.clientY - r.top) * k);
  }
  function onLeave() {
    L.over = false;
    L.to = 0;
    kick();
  }
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerdown", onMove);
  el.addEventListener("pointerleave", onLeave);
  return {
    aim,
    rest() {
      if (!L.over) {
        L.to = 0;
        kick();
      }
    },
    stop() {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (L.raf) cancelAnimationFrame(L.raf);
      L.raf = 0;
    },
  };
}

/**
 * Displacement map for the slab's top edge: red = x, green = y, 128 = none.
 * The rounded box starts PAD pixels down (neutral above it, where the
 * meniscus swings) and runs far below, so only the top edge and corners
 * bend. Mapped at half resolution; the filter stretches it back.
 */
function slabMap(w: number, h: number, r: number, bezel: number): string {
  const k = 0.5;
  const mw = Math.max(1, Math.round(w * k));
  const mh = Math.max(1, Math.round(h * k));
  const c = document.createElement("canvas");
  c.width = mw;
  c.height = mh;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(mw, mh);
  const hw = w / 2;
  const hh = h;
  const sd = (x: number, y: number) => {
    const qx = Math.abs(x) - (hw - r);
    const qy = Math.abs(y) - (hh - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };
  for (let j = 0; j < mh; j++) {
    for (let i = 0; i < mw; i++) {
      const x = (i + 0.5) / k - hw;
      const y = (j + 0.5) / k - PAD - hh;
      const t = -sd(x, y);
      let dx = 0;
      let dy = 0;
      if (t > 0 && t < bezel) {
        const nx = sd(x + 0.5, y) - sd(x - 0.5, y);
        const ny = sd(x, y + 0.5) - sd(x, y - 0.5);
        const len = Math.hypot(nx, ny) || 1;
        const m = Math.pow(1 - t / bezel, 2);
        dx = (-nx / len) * m;
        dy = (-ny / len) * m;
      }
      const o = (j * mw + i) * 4;
      img.data[o] = Math.round(128 + 127 * dx);
      img.data[o + 1] = Math.round(128 + 127 * dy);
      img.data[o + 2] = 128;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

export function GlassTintFooter({
  brand,
  tagline,
  columns,
  legal = [],
  note,
  newsletter = true,
  onSubscribe,
  tint,
  sample = true,
  tone = "dark",
  refraction = 1,
  overlap = 56,
  rise = true,
  meniscus = 1,
  scroll = "page",
  className = "",
}: {
  brand: string;
  tagline?: string;
  columns: FooterColumn[];
  legal?: FooterLink[];
  /** The small print, e.g. "© 2026 Studio". */
  note?: string;
  /** Show the email capsule. */
  newsletter?: boolean;
  /** Called with the email on submit. Wire it to your own endpoint. */
  onSubscribe?: (email: string) => void;
  /** Fallback (or fixed, with sample off) tint, "#rrggbb". */
  tint?: string;
  /** Read the tint from the section above. */
  sample?: boolean;
  tone?: Tone;
  /** Rim refraction, 0–2 (Chromium only). */
  refraction?: number;
  /** How far the slab rises over the section above, px. */
  overlap?: number;
  /** Rise over the section as the footer scrolls in. Off: it sits risen. */
  rise?: boolean;
  /** How much the top edge sloshes when you scroll fast, 0–1.5. 0 keeps it still. */
  meniscus?: number;
  /**
   * "page" (default): follow the window's scroll, for a real page.
   * "frame": follow the nearest scrolling ancestor, for a fixed-height box.
   */
  scroll?: "page" | "frame";
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const slabRef = useRef<HTMLDivElement>(null);
  const tintRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLSpanElement>(null);
  const mapRef = useRef<SVGFEImageElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const edgeRef = useRef<SVGPathElement>(null);
  const inClipRef = useRef<SVGPathElement>(null);
  const outClipRef = useRef<SVGPathElement>(null);
  const rimGradRef = useRef<SVGLinearGradientElement>(null);
  const litGradRef = useRef<SVGRadialGradientElement>(null);
  const litRef = useRef<SVGUseElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const filterId = "gtf" + uid;
  const emailId = "gtfe" + uid;
  const edgeId = "gtfp" + uid;
  const inId = "gtfi" + uid;
  const outId = "gtfo" + uid;
  const rimId = "gtfr" + uid;
  const litId = "gtfl" + uid;
  // What the effects share: the lens at full rise, the current edge, and the
  // light and droplet controls the handlers call into.
  const shared = useRef<Shared>({
    lens: 0,
    lensOn: false,
    y0: PAD,
    kick: noop,
    aim: noop,
    rest: noop,
    hover: noop,
    leave: noop,
    focus: noop,
    blur: noop,
  });
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const dark = tone === "dark";
  const fallback = rgbOf(tint) || "124,92,255";
  const base = "blur(20px) saturate(180%) brightness(" + (dark ? 1.08 : 1.04) + ")";
  const lift = Math.max(0, overlap);

  // Sample the section above, and follow it: its attributes changing, or a
  // different element taking its place.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let watched: Element | null = null;
    let warned = false;
    const attrs = new MutationObserver(() => read());
    const read = () => {
      const prev = el.previousElementSibling as HTMLElement | null;
      let rgb: string | null = null;
      if (sample && prev) {
        rgb = rgbOf(prev.getAttribute("data-glass-tint")) || rgbFromComputed(getComputedStyle(prev).backgroundColor);
      }
      if (sample && !rgb && !warned && process.env.NODE_ENV !== "production") {
        warned = true;
        console.warn(
          "GlassTintFooter: nothing to sample. Put the footer directly after the section it should borrow from, and give that section data-glass-tint=\"#rrggbb\" or an opaque background colour."
        );
      }
      el.style.setProperty("--gtf-rgb", rgb || fallback);
      if (sample && prev !== watched) {
        attrs.disconnect();
        watched = prev;
        if (prev) attrs.observe(prev, { attributes: true, attributeFilter: ["data-glass-tint", "style", "class"] });
      }
    };
    read();
    const parent = el.parentElement;
    const kids = new MutationObserver(() => read());
    if (sample && parent) kids.observe(parent, { childList: true });
    return () => {
      attrs.disconnect();
      kids.disconnect();
    };
  }, [sample, fallback]);

  // The rise and the meniscus. One loop reads the footer's place in its
  // scroll box, sets the edge height from it, drives the springs from the
  // scroll speed, and redraws the clip and the rim. It sleeps when the
  // footer is off screen or everything has settled.
  useEffect(() => {
    const foot = ref.current;
    const slab = slabRef.current;
    const content = contentRef.current;
    const S = shared.current;
    if (!foot || !slab || !content) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = scroll === "frame" ? scrollParent(foot) : null;
    const strength = Math.min(1.5, Math.max(0, meniscus));
    const st = {
      W: 0,
      H: 0,
      y0: PAD,
      ty: PAD,
      pos: 0,
      hasPos: false,
      vs: 0,
      m: MODES.map(() => ({ x: 0, v: 0 })),
      raf: 0,
      last: 0,
      visible: true,
      moved: false,
      bias: 0.35,
      lensY: NaN,
      lensS: -1,
    };

    /** Where the edge should sit now, from the footer's place in view; returns its position for speed. */
    function measure(): number {
      const fr = foot!.getBoundingClientRect();
      const k = foot!.offsetHeight / (fr.height || 1);
      let top = 0;
      let bottom = window.innerHeight;
      if (root) {
        const rr = root.getBoundingClientRect();
        top = rr.top;
        bottom = rr.bottom;
      }
      // How far the section's bottom line has come up into view, in layout px.
      const shown = (bottom - fr.top) * k - PAD - lift;
      const range = Math.max(1, Math.min(st.H - PAD - lift, (bottom - top) * k) * 0.85);
      const p = rise && !reduce.matches ? ease(shown / range) : 1;
      st.ty = PAD + lift * (1 - p);
      return (fr.top - top) * k;
    }

    function paint() {
      const W = st.W;
      const H = st.H;
      if (!W || !H) return;
      const y0 = st.y0;
      const r = Math.min(RADIUS, W / 2);
      const x0 = r;
      const span = Math.max(0, W - 2 * r);
      const lim = PAD - 2;
      const f = (n: number) => n.toFixed(1);
      let flat = true;
      for (const m of st.m) if (Math.abs(m.x) > 0.05) flat = false;
      let wave = "L" + f(x0 + span) + " " + f(y0);
      if (!flat) {
        // Sample the standing waves across the flat top (pinned at the
        // corners) and join the samples with quadratic curves through their
        // midpoints, so the edge stays smooth at any width.
        const N = 24;
        const px: number[] = [];
        const py: number[] = [];
        for (let i = 0; i <= N; i++) {
          const u = i / N;
          let d = 0;
          for (let j = 0; j < st.m.length; j++) d += st.m[j].x * Math.sin((j + 1) * Math.PI * u);
          px.push(x0 + span * u);
          py.push(y0 + lim * Math.tanh(d / lim));
        }
        wave = "";
        for (let i = 1; i < N; i++) {
          wave += "Q" + f(px[i]) + " " + f(py[i]) + " " + f((px[i] + px[i + 1]) / 2) + " " + f((py[i] + py[i + 1]) / 2);
        }
        wave += "L" + f(px[N]) + " " + f(py[N]);
      }
      const arcL = "A" + r + " " + r + " 0 0 1 " + f(x0) + " " + f(y0);
      const arcR = "A" + r + " " + r + " 0 0 1 ";
      const clip =
        "M0 " + H + "L0 " + f(y0 + r) + arcL + wave + arcR + W + " " + f(y0 + r) + "L" + W + " " + H + "Z";
      const edge =
        "M0.5 " + H + "L0.5 " + f(y0 + r) + arcL + wave + arcR + (W - 0.5) + " " + f(y0 + r) + "L" + (W - 0.5) + " " + H;
      const css = 'path("' + clip + '")';
      slab!.style.setProperty("clip-path", css);
      slab!.style.setProperty("-webkit-clip-path", css);
      edgeRef.current?.setAttribute("d", edge);
      inClipRef.current?.setAttribute("d", clip);
      outClipRef.current?.setAttribute("d", "M-400 -400H" + (W + 400) + "V" + (H + 400) + "H-400Z" + clip);
      rimGradRef.current?.setAttribute("y1", f(y0 - 4));
      rimGradRef.current?.setAttribute("y2", String(H));
      // Whole pixels for the copy, so text never rests on a half pixel.
      content!.style.transform = "translate3d(0," + Math.round(y0 - PAD) + "px,0)";
      if (tintRef.current) tintRef.current.style.transform = "translate3d(0," + y0.toFixed(2) + "px,0)";
      // The CSS rim was the no-JS stand-in; the drawn rim takes over.
      if (ringRef.current) ringRef.current.style.display = "none";
      S.y0 = y0;
      // The lens band follows the edge, and its bend ramps up as the slab rises.
      if (S.lensOn && mapRef.current && dispRef.current) {
        const my = Math.round(y0 - PAD);
        if (my !== st.lensY) {
          st.lensY = my;
          mapRef.current.setAttribute("y", String(my));
        }
        const sc = Math.round(S.lens * (lift > 0 ? Math.max(0, 1 - (y0 - PAD) / lift) : 1));
        if (sc !== st.lensS) {
          st.lensS = sc;
          dispRef.current.setAttribute("scale", String(sc));
        }
      }
    }

    function settleSprings() {
      for (const m of st.m) {
        m.x = 0;
        m.v = 0;
      }
    }

    function step(now: number) {
      st.raf = 0;
      const dt = st.last ? Math.min(1 / 30, (now - st.last) / 1000) : 1 / 60;
      st.last = now;
      const pos = measure();
      const raw = st.hasPos ? (pos - st.pos) / dt : 0;
      st.pos = pos;
      st.hasPos = true;
      st.vs += (raw - st.vs) * (1 - Math.exp(-dt / 0.07));
      st.y0 = reduce.matches ? st.ty : st.y0 + (st.ty - st.y0) * (1 - Math.exp(-dt / 0.08));
      if (reduce.matches || strength <= 0) settleSprings();
      else {
        // The edge lags the slab: moving up, its middle sags; moving down, it
        // bulges. Released, the springs overshoot and slosh, then settle.
        const t1 = SWING * strength * Math.tanh(-st.vs / 1400);
        const targets = [t1, 0.5 * st.bias * t1, 0.2 * t1];
        for (let j = 0; j < st.m.length; j++) {
          const m = st.m[j];
          const w = 2 * Math.PI * MODES[j].f;
          m.v += (-w * w * (m.x - targets[j]) - 2 * MODES[j].z * w * m.v) * dt;
          m.x += m.v * dt;
        }
      }
      paint();
      let busy = st.moved || Math.abs(st.vs) > 2 || Math.abs(st.ty - st.y0) > 0.1;
      for (const m of st.m) if (Math.abs(m.x) > 0.12 || Math.abs(m.v) > 1.5) busy = true;
      st.moved = false;
      if (busy && st.visible) st.raf = requestAnimationFrame(step);
      else {
        st.last = 0;
        st.hasPos = false;
        st.vs = 0;
        st.y0 = st.ty;
        settleSprings();
        paint();
      }
    }

    const kick = () => {
      if (!st.raf) st.raf = requestAnimationFrame(step);
    };
    S.kick = kick;

    // Size changes: re-measure and place the edge at once, without a slosh.
    const ro = new ResizeObserver(() => {
      const first = !st.W;
      st.W = slab.offsetWidth;
      st.H = slab.offsetHeight;
      measure();
      if (first || !st.raf) {
        st.y0 = st.ty;
        settleSprings();
      }
      paint();
    });
    ro.observe(slab);

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        st.visible = e.isIntersecting;
        st.hasPos = false;
        if (st.visible) kick();
      },
      { root, rootMargin: "64px 0px" }
    );
    io.observe(foot);

    const onScroll = () => {
      // Nothing here follows the scroll when the edge is still and risen.
      if (reduce.matches || (!rise && strength <= 0)) return;
      st.moved = true;
      if (st.visible) kick();
    };
    const onResize = () => {
      st.hasPos = false;
      kick();
    };
    // Which side the pointer is on tips the slosh that way.
    const onPointer = (e: PointerEvent) => {
      const r = slab.getBoundingClientRect();
      st.bias = Math.max(-1, Math.min(1, ((e.clientX - r.left) / (r.width || 1) - 0.5) * 2));
    };
    const target: HTMLElement | Window = root || window;
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    slab.addEventListener("pointermove", onPointer);
    return () => {
      ro.disconnect();
      io.disconnect();
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      slab.removeEventListener("pointermove", onPointer);
      if (st.raf) cancelAnimationFrame(st.raf);
      st.raf = 0;
      S.kick = noop;
    };
  }, [scroll, rise, meniscus, lift]);

  // A light that follows the pointer (and keyboard focus) across the slab:
  // the rim nearest it brightens, a soft specular sits below it.
  useEffect(() => {
    const slab = slabRef.current;
    const S = shared.current;
    if (!slab) return;
    const light = followPointer(slab, (x, y, o) => {
      slab.style.setProperty("--gtf-lx", x.toFixed(1) + "px");
      slab.style.setProperty("--gtf-ly", y.toFixed(1) + "px");
      slab.style.setProperty("--gtf-lo", o.toFixed(3));
      litGradRef.current?.setAttribute("cx", x.toFixed(1));
      litGradRef.current?.setAttribute("cy", y.toFixed(1));
      litRef.current?.setAttribute("opacity", o.toFixed(3));
    });
    S.aim = light.aim;
    S.rest = light.rest;
    return () => {
      light.stop();
      S.aim = noop;
      S.rest = noop;
    };
  }, []);

  // The slab's lens, sized to it, where the engine can run it. The motion
  // loop moves it with the edge and ramps its strength with the rise.
  useEffect(() => {
    const slab = slabRef.current;
    const S = shared.current;
    if (!slab) return;
    if (!isChromium() || refraction <= 0) {
      S.lensOn = false;
      slab.style.backdropFilter = base;
      return;
    }
    let key = "";
    const apply = () => {
      const w = Math.round(slab.offsetWidth);
      const h = Math.round(slab.offsetHeight);
      if (!w || !h || !mapRef.current || !dispRef.current) return;
      // Refraction up to 1 strengthens the bend; above 1 it widens the bent
      // band instead, so the peak offset never passes 0.4 of the bezel.
      const bezel = Math.min(44 * Math.max(1, refraction), (h - PAD) * 0.3);
      const mh = h + lift + 2;
      const k = w + "x" + mh + ":" + bezel.toFixed(1);
      if (k !== key) {
        key = k;
        mapRef.current.setAttribute("href", slabMap(w, mh, RADIUS, bezel));
        mapRef.current.setAttribute("width", String(w));
        mapRef.current.setAttribute("height", String(mh));
      }
      S.lens = Math.round(0.8 * bezel * Math.min(1, refraction));
      S.lensOn = true;
      slab.style.backdropFilter = "url(#" + filterId + ") " + base;
      S.kick();
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(slab);
    return () => {
      ro.disconnect();
      S.lensOn = false;
    };
  }, [filterId, base, refraction, lift]);

  // The droplet: a small clear lens that glides between the links on hover
  // and focus. A spring per axis, stretched along its travel; it condenses
  // where it is first needed and evaporates when nothing is chosen.
  useEffect(() => {
    const box = contentRef.current;
    const drop = dropRef.current;
    const slab = slabRef.current;
    const S = shared.current;
    if (!box || !drop || !slab) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const d = {
      x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, vw: 0, vh: 0,
      tx: 0, ty: 0, tw: 0, th: 0, s: 0, ts: 0,
      raf: 0, last: 0, timer: 0, on: null as HTMLElement | null,
    };

    function paint() {
      const still = reduce.matches;
      const ax = still ? 0 : Math.min(0.22, Math.abs(d.vx) / 3200);
      const ay = still ? 0 : Math.min(0.22, Math.abs(d.vy) / 3200);
      const m = 0.25 + 0.75 * d.s;
      const sx = (1 + ax) * (1 - 0.5 * ay) * m;
      const sy = (1 + ay) * (1 - 0.5 * ax) * m;
      drop!.style.width = d.w.toFixed(1) + "px";
      drop!.style.height = d.h.toFixed(1) + "px";
      drop!.style.transform =
        "translate(" + d.x.toFixed(2) + "px," + d.y.toFixed(2) + "px) scale(" + sx.toFixed(4) + "," + sy.toFixed(4) + ")";
      drop!.style.visibility = d.s < 0.02 && d.ts === 0 ? "hidden" : "visible";
    }

    function step(now: number) {
      d.raf = 0;
      const dt = d.last ? Math.min(1 / 30, (now - d.last) / 1000) : 1 / 60;
      d.last = now;
      if (reduce.matches) {
        d.x = d.tx;
        d.y = d.ty;
        d.w = d.tw;
        d.h = d.th;
        d.vx = d.vy = d.vw = d.vh = 0;
        d.s = d.ts;
      } else {
        // Slightly under-damped: it arrives in about half a second with a
        // small liquid overshoot.
        const k = 120;
        const c = 15;
        d.vx += (k * (d.tx - d.x) - c * d.vx) * dt;
        d.x += d.vx * dt;
        d.vy += (k * (d.ty - d.y) - c * d.vy) * dt;
        d.y += d.vy * dt;
        d.vw += (k * (d.tw - d.w) - c * d.vw) * dt;
        d.w += d.vw * dt;
        d.vh += (k * (d.th - d.h) - c * d.vh) * dt;
        d.h += d.vh * dt;
        d.s += (d.ts - d.s) * (1 - Math.exp(-dt / 0.14));
      }
      paint();
      const moving =
        Math.abs(d.tx - d.x) > 0.2 || Math.abs(d.ty - d.y) > 0.2 || Math.abs(d.tw - d.w) > 0.2 ||
        Math.abs(d.th - d.h) > 0.2 || Math.abs(d.vx) + Math.abs(d.vy) > 3 || Math.abs(d.ts - d.s) > 0.004;
      if (moving) d.raf = requestAnimationFrame(step);
      else {
        d.x = d.tx;
        d.y = d.ty;
        d.w = d.tw;
        d.h = d.th;
        d.vx = d.vy = d.vw = d.vh = 0;
        d.s = d.ts;
        paint();
        d.last = 0;
      }
    }
    const kick = () => {
      if (!d.raf) d.raf = requestAnimationFrame(step);
    };

    function target(el: HTMLElement) {
      const o = offsetIn(el, box!);
      d.tx = o.x - DROP_X;
      d.ty = o.y - DROP_Y;
      d.tw = o.w + DROP_X * 2;
      d.th = o.h + DROP_Y * 2;
    }
    function hover(el: HTMLElement) {
      window.clearTimeout(d.timer);
      target(el);
      // A droplet that is not there yet forms in place rather than flying in.
      if (d.s < 0.15) {
        d.x = d.tx;
        d.y = d.ty;
        d.w = d.tw;
        d.h = d.th;
        d.vx = d.vy = d.vw = d.vh = 0;
      }
      d.ts = 1;
      if (d.on && d.on !== el) d.on.style.transform = "";
      el.style.transform = "scale(1.05)";
      d.on = el;
      kick();
    }
    function leave() {
      window.clearTimeout(d.timer);
      // A short grace period, so crossing the gap between links keeps it.
      d.timer = window.setTimeout(() => {
        d.ts = 0;
        if (d.on) d.on.style.transform = "";
        d.on = null;
        kick();
      }, 140);
    }
    S.hover = hover;
    S.leave = leave;
    S.focus = (el: HTMLElement) => {
      const link = el.closest("a[data-gtf-link]") as HTMLElement | null;
      if (link) hover(link);
      const o = offsetIn(el, box);
      S.aim(box.offsetLeft + o.x + o.w / 2, box.offsetTop + (S.y0 - PAD) + o.y + o.h / 2);
    };
    S.blur = (to: Element | null) => {
      if (!to || !to.closest("a[data-gtf-link]")) leave();
      if (!to || !slab.contains(to)) S.rest();
    };
    // Reflow (a resize, fonts arriving) moves the links: follow them.
    const ro = new ResizeObserver(() => {
      if (d.on) {
        target(d.on);
        kick();
      }
    });
    ro.observe(box);
    return () => {
      ro.disconnect();
      window.clearTimeout(d.timer);
      if (d.raf) cancelAnimationFrame(d.raf);
      d.raf = 0;
      if (d.on) d.on.style.transform = "";
      S.hover = noop;
      S.leave = noop;
      S.focus = noop;
      S.blur = noop;
    };
  }, []);

  function linkFrom(t: EventTarget | null): HTMLElement | null {
    return t instanceof Element ? (t.closest("a[data-gtf-link]") as HTMLElement | null) : null;
  }
  function onOver(e: ReactPointerEvent<HTMLDivElement>) {
    const a = linkFrom(e.target);
    if (a) shared.current.hover(a);
  }
  function onOut(e: ReactPointerEvent<HTMLDivElement>) {
    if (linkFrom(e.target) && !linkFrom(e.relatedTarget)) shared.current.leave();
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    onSubscribe?.(email.trim());
    setSent(true);
  }

  const ink = dark ? "#ffffff" : "#111111";
  const soft = dark ? "rgba(255,255,255,0.66)" : "rgba(17,17,17,0.66)";
  const restClip = "inset(" + PAD + "px 0 0 0 round " + RADIUS + "px " + RADIUS + "px 0 0)";
  const ring = "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)";
  const linkCls =
    "inline-block transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] focus-visible:underline focus-visible:underline-offset-4 motion-reduce:transition-none";

  return (
    <footer
      ref={ref}
      className={"@container pointer-events-none relative z-10 " + className}
      style={{ marginTop: -(lift + PAD), color: ink }}
    >
      <div
        ref={slabRef}
        className="pointer-events-auto relative isolate overflow-hidden"
        style={{
          background: dark ? "rgba(14,14,20,0.42)" : "rgba(255,255,255,0.5)",
          backdropFilter: base,
          WebkitBackdropFilter: base,
          clipPath: restClip,
          WebkitClipPath: restClip,
        }}
      >
        {/* The borrowed tint: strongest along the edge, fading down. It rides
            with the edge, and uses background-color (not a gradient) so it
            transitions. */}
        <span
          ref={tintRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-[background-color] duration-[600ms] ease-out"
          style={{
            transform: "translate3d(0," + PAD + "px,0)",
            backgroundColor: "rgba(var(--gtf-rgb, " + fallback + "), " + (dark ? 0.34 : 0.26) + ")",
            WebkitMaskImage: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0.45) 38%, rgba(0,0,0,0.12) 100%)",
            maskImage: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0.45) 38%, rgba(0,0,0,0.12) 100%)",
          }}
        />
        {/* A plain graduated rim for the first paint (and without script);
            the drawn rim replaces it once the edge is live. */}
        <span
          ref={ringRef}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            top: PAD,
            borderRadius: RADIUS + "px " + RADIUS + "px 0 0",
            padding: "1px 1px 0 1px",
            background:
              "linear-gradient(180deg, rgba(255,255,255," + (dark ? 0.6 : 0.95) + ") 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.22) 100%)",
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            mask: ring,
          }}
        />
        {/* The pointer's soft specular. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: "var(--gtf-lo, 0)",
            background:
              "radial-gradient(420px circle at var(--gtf-lx, -999px) var(--gtf-ly, -999px), rgba(255,255,255," + (dark ? 0.14 : 0.3) + "), rgba(255,255,255,0) 65%)",
            mixBlendMode: dark ? "screen" : "normal",
          }}
        />
        <div
          ref={contentRef}
          className="relative isolate"
          style={{ marginTop: PAD }}
          onPointerOver={onOver}
          onPointerOut={onOut}
          onFocus={(e) => shared.current.focus(e.target as HTMLElement)}
          onBlur={(e) => shared.current.blur(e.relatedTarget instanceof Element ? e.relatedTarget : null)}
        >
          {/* The droplet sits UNDER the link text: it lights and lifts the
              link, it never bends the letters. */}
          <span
            ref={dropRef}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 rounded-full"
            style={{
              zIndex: -1,
              width: 0,
              height: 0,
              visibility: "hidden",
              transformOrigin: "50% 50%",
              background: dark
                ? "radial-gradient(120% 140% at 50% 0%, rgba(var(--gtf-rgb, " + fallback + "),0.26), rgba(var(--gtf-rgb, " + fallback + "),0) 70%), linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.1) 100%)"
                : "radial-gradient(120% 140% at 50% 0%, rgba(var(--gtf-rgb, " + fallback + "),0.2), rgba(var(--gtf-rgb, " + fallback + "),0) 70%), linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 55%, rgba(255,255,255,0.45) 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 1px rgba(255,255,255,0.3), inset 0 0 10px rgba(255,255,255," +
                (dark ? 0.16 : 0.3) + "), 0 6px 18px rgba(0,0,0," + (dark ? 0.2 : 0.1) + ")",
            }}
          />
          <div className="mx-auto max-w-[1180px] px-6 pb-8 pt-14 @3xl:px-12 @3xl:pt-16">
            <div className="grid gap-10 @3xl:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
              <div className="max-w-[360px]">
                <p className="text-[22px] font-semibold tracking-[-0.02em]">{brand}</p>
                {tagline && (
                  <p className="mt-2 text-[15px] leading-relaxed" style={{ color: soft }}>
                    {tagline}
                  </p>
                )}
                {newsletter && (
                  <form onSubmit={submit} className="mt-6">
                    <label htmlFor={emailId} className="text-[13px] font-semibold" style={{ color: soft }}>
                      {sent ? "You're subscribed." : "One email a month"}
                    </label>
                    <div
                      className="mt-2 flex items-center gap-1 rounded-full p-1 pl-4 has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-white/70"
                      style={{
                        background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(255,255,255,0.08)",
                      }}
                    >
                      <input
                        id={emailId}
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@studio.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:opacity-50"
                        style={{ color: ink }}
                      />
                      <button
                        type="submit"
                        className="h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold outline-none transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] focus-visible:ring-2 focus-visible:ring-white/80 active:scale-[0.97]"
                        style={{ background: dark ? "#ffffff" : "#111111", color: dark ? "#111111" : "#ffffff" }}
                      >
                        Subscribe
                      </button>
                    </div>
                  </form>
                )}
              </div>
              <nav aria-label="Footer" className="grid grid-cols-2 gap-8 @xl:grid-cols-3">
                {columns.map((c) => (
                  <div key={c.title}>
                    <p className="text-[13px] font-semibold" style={{ color: soft }}>
                      {c.title}
                    </p>
                    <ul className="mt-3 space-y-2.5">
                      {c.links.map((l) => (
                        <li key={l.label}>
                          <a
                            href={safeHref(l.href)}
                            data-gtf-link=""
                            className={"text-[15px] " + linkCls}
                            style={{ outline: "none" }}
                          >
                            {l.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>
            <div
              className="mt-12 flex flex-col gap-3 pt-6 text-[13px] @2xl:flex-row @2xl:items-center @2xl:justify-between"
              style={{ borderTop: "1px solid " + (dark ? "rgba(255,255,255,0.12)" : "rgba(17,17,17,0.1)"), color: soft }}
            >
              {note && <p>{note}</p>}
              {legal.length > 0 && (
                <ul className="flex flex-wrap gap-x-5 gap-y-1">
                  {legal.map((l) => (
                    <li key={l.label}>
                      <a href={safeHref(l.href)} data-gtf-link="" className={linkCls} style={{ outline: "none" }}>
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
          <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage ref={mapRef} x="0" y="0" preserveAspectRatio="none" result="map" />
            <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      </div>
      {/* The edge, drawn along the slab's own clip: a soft shadow above it,
          a lit lip just inside it, the graduated rim and the pointer's light
          on the rim. Outside the slab so the shadow is not clipped away. */}
      <svg aria-hidden className="pointer-events-none absolute left-0 top-0 h-full w-full" style={{ overflow: "visible" }}>
        <defs>
          <path ref={edgeRef} id={edgeId} d="" fill="none" />
          <clipPath id={inId}>
            <path ref={inClipRef} d="" />
          </clipPath>
          <clipPath id={outId}>
            <path ref={outClipRef} d="" clipRule="evenodd" />
          </clipPath>
          <linearGradient ref={rimGradRef} id={rimId} gradientUnits="userSpaceOnUse" x1="0" y1={PAD} x2="0" y2="400">
            <stop offset="0" stopColor="#ffffff" stopOpacity={dark ? 0.6 : 0.95} />
            <stop offset="0.38" stopColor="#ffffff" stopOpacity={0.12} />
            <stop offset="0.7" stopColor="#ffffff" stopOpacity={0.06} />
            <stop offset="1" stopColor="#ffffff" stopOpacity={0.22} />
          </linearGradient>
          <radialGradient ref={litGradRef} id={litId} gradientUnits="userSpaceOnUse" cx="-999" cy="-999" r="280">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.95} />
            <stop offset="0.7" stopColor="#ffffff" stopOpacity={0} />
          </radialGradient>
        </defs>
        <g clipPath={"url(#" + outId + ")"}>
          <use href={"#" + edgeId} stroke="#000000" strokeOpacity={dark ? 0.035 : 0.02} strokeWidth={56} />
          <use href={"#" + edgeId} stroke="#000000" strokeOpacity={dark ? 0.05 : 0.025} strokeWidth={28} />
          <use href={"#" + edgeId} stroke="#000000" strokeOpacity={dark ? 0.06 : 0.03} strokeWidth={10} />
        </g>
        <g clipPath={"url(#" + inId + ")"}>
          <use href={"#" + edgeId} stroke="#ffffff" strokeOpacity={dark ? 0.045 : 0.08} strokeWidth={16} />
          <use href={"#" + edgeId} stroke="#ffffff" strokeOpacity={dark ? 0.06 : 0.1} strokeWidth={8} />
          <use href={"#" + edgeId} stroke="#ffffff" strokeOpacity={dark ? 0.1 : 0.16} strokeWidth={3} />
        </g>
        <use href={"#" + edgeId} stroke={"url(#" + rimId + ")"} strokeWidth={1.2} />
        <use ref={litRef} href={"#" + edgeId} stroke={"url(#" + litId + ")"} strokeWidth={1.6} opacity={0} />
      </svg>
    </footer>
  );
}
