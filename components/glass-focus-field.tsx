"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";

/**
 * GlassField — a liquid-glass text field that reacts before, during and
 * after you type.
 *
 * Before focus, the rim notices the pointer: within about 140px the stretch
 * of rim nearest it lights up and the bezel thickens a little (in Chromium
 * the edge also starts to bend what is behind it). Focus it and a second,
 * deeper pane blooms outward from the point you clicked (or from where the
 * text starts, when you arrive by keyboard): more blur, more saturation, a
 * brighter rim, and in Chromium a refracting edge. While you type, the rim
 * light rides with the caret, and every keystroke sends a short ripple
 * through the glass from the caret: outward as you type, inward as you
 * delete. An error keeps the warm tint and clouds the glass for a moment,
 * the frost thickening and then clearing, instead of shaking.
 *
 * The label floats up out of the way on focus or once there is a value.
 * `error` tints the glass warm and announces the message; `hint` sits below.
 * Works as a single-line field (a full pill, the kit's control shape) or,
 * with `multiline`, a textarea with 24px corners.
 *
 * The panes are siblings rather than nested, so each one blurs the page
 * behind it rather than another pane. The refracting edges run only in
 * Chromium (detected, not guessed with @supports: Safari and Firefox parse
 * backdrop-filter: url() and draw nothing); elsewhere every reaction is
 * blur, saturation, light and rim. The caret is measured with a hidden
 * mirror in layout pixels, so it lands right inside scaled containers too.
 * Under prefers-reduced-motion the bloom is instant, there are no ripples
 * and no clouding, and the light moves without easing. The loop sleeps
 * when nothing is moving and when the field is off screen.
 *
 * Needs Tailwind v4 (or v3.4+). No dependencies beyond React.
 */

type Tone = "dark" | "light";
type Api = { focused: boolean; restLens: number; kick: () => void; caret: () => void };
type Ripple = { x: number; y: number; t0: number; inward: boolean; big: boolean };

const noop = () => {};
/** How close the pointer comes before the rim notices it, px. */
const NOTICE = 140;
/** At most this many ripples in the glass at once. */
const MAX_RIPPLES = 4;
/** The resting glass and its bezel, before anything comes near. */
const REST_GLASS = "blur(6px) saturate(150%) brightness(1.04)";
const BEZEL_REST = "inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 0 6px rgba(255,255,255,0.02)";
const BULLET = String.fromCharCode(8226);
const ZWSP = String.fromCharCode(8203);

/** "#rrggbb" to "r,g,b", or null. Anything else is ignored, never interpolated. */
function rgbOf(hex?: string): string | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
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

/** Signed distance from a point to a rounded box centred on the origin (negative inside). */
function boxDist(x: number, y: number, hw: number, hh: number, r: number): number {
  const qx = Math.abs(x) - (hw - r);
  const qy = Math.abs(y) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Displacement map for a rounded rectangle: red = x, green = y, 128 = none. */
function lensMap(w: number, h: number, r: number, bezel: number): string {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, h);
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.min(r, hw, hh);
  const sd = (x: number, y: number) => boxDist(x, y, hw, hh, rr);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const x = i + 0.5 - hw;
      const y = j + 0.5 - hh;
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
      const k = (j * w + i) * 4;
      img.data[k] = Math.round(128 + 127 * dx);
      img.data[k + 1] = Math.round(128 + 127 * dy);
      img.data[k + 2] = 128;
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

export function GlassField({
  label,
  name,
  id,
  type = "text",
  value,
  defaultValue,
  onChange,
  placeholder,
  multiline = false,
  rows = 4,
  hint,
  error,
  required,
  disabled,
  autoComplete,
  tone = "dark",
  tint,
  refraction = 1,
  className = "",
}: {
  label: string;
  name?: string;
  id?: string;
  type?: "text" | "email" | "password" | "search" | "tel" | "url";
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Shown only once the label has floated out of the way. */
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  /** A message here marks the field invalid, tints the glass warm and clouds it once. */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  /** Glass over dark content (white text) or light content (ink text). */
  tone?: Tone;
  /** Tint of the focused glass, "#rrggbb", at 14%. */
  tint?: string;
  /** Edge refraction, 0–2 (Chromium only). Above 1 it widens the bent band. */
  refraction?: number;
  className?: string;
}) {
  const auto = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fieldId = id || "gf" + auto;
  const filterId = "gfl" + auto;
  const restId = "gfr" + auto;
  const shellRef = useRef<HTMLDivElement>(null);
  const restRef = useRef<HTMLSpanElement>(null);
  const thickRef = useRef<HTMLSpanElement>(null);
  const cloudRef = useRef<HTMLSpanElement>(null);
  const bezelRef = useRef<HTMLSpanElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<SVGFEImageElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const restMapRef = useRef<SVGFEImageElement>(null);
  const restDispRef = useRef<SVGFEDisplacementMapElement>(null);
  const origin = useRef({ x: 22, y: 0, fromPointer: false });
  // What the handlers share with the reaction loop.
  const api = useRef<Api>({ focused: false, restLens: 0, kick: noop, caret: noop });
  const lastError = useRef(error);
  const cloudTimer = useRef(0);
  const [focused, setFocused] = useState(false);
  const [typed, setTyped] = useState(!!defaultValue);
  const filled = value !== undefined ? value !== "" : typed;
  const floated = focused || filled;
  const dark = tone === "dark";
  const radius = multiline ? 24 : 999;

  const thickBase = "blur(18px) saturate(200%) brightness(" + (dark ? 1.1 : 1.05) + ")";

  // The refracting edges, sized to the field, where the engine can run them:
  // the deep pane's at full strength, the rest pane's ramped by the loop.
  useEffect(() => {
    const shell = shellRef.current;
    const thick = thickRef.current;
    const A = api.current;
    if (!shell || !thick) return;
    if (!isChromium() || refraction <= 0) {
      thick.style.backdropFilter = thickBase;
      A.restLens = 0;
      A.kick();
      return;
    }
    let key = "";
    const apply = () => {
      const w = Math.round(shell.offsetWidth);
      const h = Math.round(shell.offsetHeight);
      if (!w || !h || !mapRef.current || !dispRef.current || !restMapRef.current) return;
      // Refraction up to 1 strengthens the bend; above 1 it widens the bent
      // band instead, so the peak offset never passes 0.4 of the bezel.
      const bezel = Math.min(14 * Math.max(1, refraction), h * 0.3);
      const k = w + "x" + h + ":" + bezel.toFixed(1);
      if (k !== key) {
        key = k;
        const url = lensMap(w, h, multiline ? 24 : h / 2, bezel);
        for (const fe of [mapRef.current, restMapRef.current]) {
          fe.setAttribute("href", url);
          fe.setAttribute("width", String(w));
          fe.setAttribute("height", String(h));
        }
      }
      const full = Math.round(0.8 * bezel * Math.min(1, refraction));
      dispRef.current.setAttribute("scale", String(full));
      thick.style.backdropFilter = "url(#" + filterId + ") " + thickBase;
      A.restLens = full;
      A.kick();
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(shell);
    return () => {
      ro.disconnect();
      A.restLens = 0;
    };
  }, [filterId, thickBase, refraction, multiline]);

  // The reactions: the rim noticing the pointer, the light riding the caret,
  // and the keystroke ripples. One loop, asleep when nothing moves.
  useEffect(() => {
    const shell = shellRef.current;
    const rest = restRef.current;
    const bezel = bezelRef.current;
    const rip = rippleRef.current;
    const mirror = mirrorRef.current;
    const A = api.current;
    if (!shell || !rest || !bezel || !rip || !mirror || disabled) return;
    const field = shell.querySelector("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null;
    if (!field) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const chromium = isChromium();
    const crest = dark ? 0.2 : 0.5;
    const trough = dark ? 0.1 : 0.06;
    const S = {
      px: 0,
      py: 0,
      has: false,
      lx: 0,
      ly: 0,
      lo: 0,
      b: 0,
      cx: 22,
      cy: 29,
      dirty: true,
      raf: 0,
      last: 0,
      visible: true,
      ripples: [] as Ripple[],
      queue: [] as { inward: boolean; big: boolean }[],
      restKey: "",
      restScale: -1,
      rippleKey: "",
    };

    /** The caret's place in the field, in layout pixels, from a hidden mirror of the text before it. */
    function caret(w: number, h: number) {
      let at = field!.value.length;
      try {
        if (field!.selectionStart !== null) at = field!.selectionStart;
      } catch {
        // Some engines throw for fields without a selection API (email): the end will do.
      }
      const text = field!.value.slice(0, at);
      mirror!.textContent = type === "password" ? BULLET.repeat(text.length) : text;
      const mark = document.createElement("span");
      mark.textContent = ZWSP;
      mirror!.appendChild(mark);
      const x = mark.offsetLeft - field!.scrollLeft;
      const y = mark.offsetTop + 12 - field!.scrollTop;
      // Emptied at once, so a long value never widens the page.
      mirror!.textContent = "";
      S.cx = Math.min(w - 14, Math.max(14, x));
      S.cy = Math.min(h - 10, Math.max(10, y));
    }

    /** One ripple as a ring of light with a faint trough beside it, or null once it has passed. */
    function ring(r: Ripple, now: number): string | null {
      const dur = r.inward ? 640 : r.big ? 900 : 760;
      const a = (now - r.t0) / dur;
      if (a >= 1) return null;
      let rad: number;
      let amp: number;
      if (r.inward) {
        rad = 4 + 110 * (0.5 + 0.5 * Math.cos(Math.PI * a));
        amp = Math.sin(Math.PI * a);
      } else {
        rad = 4 + (r.big ? 190 : 130) * (1 - Math.pow(1 - a, 3));
        amp = Math.pow(1 - a, 1.5) * Math.min(1, a / 0.08);
      }
      const W = 9;
      const px = (v: number) => Math.max(0, v).toFixed(1) + "px";
      const at = "circle at " + r.x.toFixed(1) + "px " + r.y.toFixed(1) + "px, ";
      const c = "rgba(255,255,255," + (crest * amp * (r.big ? 1.25 : 1)).toFixed(3) + ")";
      const t = "rgba(0,0,0," + (trough * amp).toFixed(3) + ")";
      const clear = "rgba(255,255,255,0)";
      // Outward, the crest leads and the trough trails inside it; inward, the reverse.
      return r.inward
        ? "radial-gradient(" + at + clear + " " + px(rad - W) + ", " + c + " " + px(rad) + ", " + t + " " + px(rad + W * 0.7) + ", " + clear + " " + px(rad + W * 1.6) + ")"
        : "radial-gradient(" + at + clear + " " + px(rad - W * 1.6) + ", " + t + " " + px(rad - W * 0.7) + ", " + c + " " + px(rad) + ", " + clear + " " + px(rad + W) + ")";
    }

    function paint(now: number) {
      shell!.style.setProperty("--gf-lx", S.lx.toFixed(1) + "px");
      shell!.style.setProperty("--gf-ly", S.ly.toFixed(1) + "px");
      shell!.style.setProperty("--gf-lo", S.lo.toFixed(3));
      const b = S.b;
      // The bezel: a wider, brighter band inside the rim as the glass thickens.
      bezel!.style.boxShadow =
        "inset 0 0 0 " + (1 + 1.5 * b).toFixed(2) + "px rgba(255,255,255," + (0.04 + 0.12 * b).toFixed(3) +
        "), inset 0 0 " + (6 + 12 * b).toFixed(1) + "px rgba(255,255,255," + (0.02 + 0.1 * b).toFixed(3) + ")";
      // The resting pane thickens with it; in Chromium its edge starts to bend.
      const soft = "blur(" + (6 + 4 * b).toFixed(1) + "px) saturate(" + Math.round(150 + 30 * b) + "%) brightness(1.04)";
      const sc = chromium && A.restLens > 0 ? Math.round(A.restLens * 0.55 * b) : 0;
      if (sc !== S.restScale && restDispRef.current) {
        S.restScale = sc;
        restDispRef.current.setAttribute("scale", String(sc));
      }
      const bf = (sc > 0 ? "url(#" + restId + ") " : "") + soft;
      if (bf !== S.restKey) {
        S.restKey = bf;
        // Prefixed first: where an engine treats the two as one property, the
        // unprefixed value (the only one that may carry the url) must win.
        rest!.style.setProperty("-webkit-backdrop-filter", soft);
        rest!.style.backdropFilter = bf;
      }
      const layers: string[] = [];
      S.ripples = S.ripples.filter((r) => {
        const g = ring(r, now);
        if (g) layers.push(g);
        return !!g;
      });
      const bg = layers.length ? layers.join(", ") : "none";
      if (bg !== S.rippleKey) {
        S.rippleKey = bg;
        rip!.style.backgroundImage = bg;
      }
    }

    function step(now: number) {
      S.raf = 0;
      const dt = S.last ? Math.min(1 / 30, (now - S.last) / 1000) : 1 / 60;
      S.last = now;
      const w = shell!.offsetWidth;
      const h = shell!.offsetHeight;
      if (S.dirty) {
        caret(w, h);
        S.dirty = false;
      }
      if (!reduce.matches) {
        for (const q of S.queue) S.ripples.push({ x: S.cx, y: S.cy, t0: now, inward: q.inward, big: q.big });
      }
      S.queue.length = 0;
      if (S.ripples.length > MAX_RIPPLES) S.ripples.splice(0, S.ripples.length - MAX_RIPPLES);

      let tx = S.lx;
      let ty = S.ly;
      let to = 0;
      let tb = 0;
      if (A.focused) {
        // Typing: the light rides with the caret.
        tx = S.cx;
        ty = S.cy;
        to = 0.7;
        tb = 1;
      } else if (S.has) {
        // At rest: the rim notices the pointer from NOTICE px away. Layout
        // pixels, even inside a transform-scaled container.
        const r = shell!.getBoundingClientRect();
        const k = w / (r.width || 1);
        const x = (S.px - r.left) * k;
        const y = (S.py - r.top) * k;
        const rr = multiline ? Math.min(24, w / 2, h / 2) : h / 2;
        const q = 1 - ease(Math.max(0, boxDist(x - w / 2, y - h / 2, w / 2, h / 2, rr)) / NOTICE);
        tx = Math.min(w, Math.max(0, x));
        ty = Math.min(h, Math.max(0, y));
        to = q;
        tb = q;
      }
      // A light that is out starts where it is needed instead of streaking there.
      if (S.lo < 0.02) {
        S.lx = tx;
        S.ly = ty;
      }
      const still = reduce.matches;
      S.lx += (tx - S.lx) * (still ? 1 : 1 - Math.exp(-dt / 0.18));
      S.ly += (ty - S.ly) * (still ? 1 : 1 - Math.exp(-dt / 0.18));
      S.lo += (to - S.lo) * (still ? 1 : 1 - Math.exp(-dt / 0.22));
      S.b += (tb - S.b) * (still ? 1 : 1 - Math.exp(-dt / 0.26));
      paint(now);
      const busy =
        Math.abs(tx - S.lx) > 0.3 || Math.abs(ty - S.ly) > 0.3 || Math.abs(to - S.lo) > 0.004 ||
        Math.abs(tb - S.b) > 0.004 || S.ripples.length > 0;
      if (busy && S.visible) S.raf = requestAnimationFrame(step);
      else S.last = 0;
    }

    const kick = () => {
      if (!S.raf) S.raf = requestAnimationFrame(step);
    };
    A.kick = kick;
    A.caret = () => {
      S.dirty = true;
      kick();
    };

    function onPointer(e: PointerEvent) {
      S.px = e.clientX;
      S.py = e.clientY;
      S.has = true;
      if (S.visible) kick();
    }
    // The pointer left the page, or a finger lifted: nothing is hovering.
    function onGone(e: PointerEvent) {
      if (e.type === "pointerout" ? !e.relatedTarget : e.pointerType === "touch") {
        S.has = false;
        kick();
      }
    }
    function onScroll() {
      if (S.visible && (S.has || S.lo > 0.005)) kick();
    }
    function onInput(e: Event) {
      const ie = e as InputEvent;
      const kind = ie.inputType || "";
      if (ie.isComposing || kind === "insertCompositionText") return;
      S.queue.push({ inward: kind.indexOf("delete") === 0, big: kind === "insertFromPaste" || kind === "insertFromDrop" });
      S.dirty = true;
      kick();
    }
    function onComposed() {
      S.queue.push({ inward: false, big: false });
      S.dirty = true;
      kick();
    }
    const onCaret = A.caret;

    const io = new IntersectionObserver((entries) => {
      S.visible = entries[entries.length - 1].isIntersecting;
      if (S.visible) kick();
    });
    io.observe(shell);
    document.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerdown", onPointer, { passive: true });
    document.addEventListener("pointerup", onGone);
    document.addEventListener("pointercancel", onGone);
    window.addEventListener("pointerout", onGone);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    field.addEventListener("input", onInput);
    field.addEventListener("compositionend", onComposed);
    field.addEventListener("keyup", onCaret);
    field.addEventListener("select", onCaret);
    field.addEventListener("pointerup", onCaret);
    field.addEventListener("scroll", onCaret);
    paint(0);
    return () => {
      io.disconnect();
      document.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("pointerup", onGone);
      document.removeEventListener("pointercancel", onGone);
      window.removeEventListener("pointerout", onGone);
      window.removeEventListener("scroll", onScroll, { capture: true });
      field.removeEventListener("input", onInput);
      field.removeEventListener("compositionend", onComposed);
      field.removeEventListener("keyup", onCaret);
      field.removeEventListener("select", onCaret);
      field.removeEventListener("pointerup", onCaret);
      field.removeEventListener("scroll", onCaret);
      if (S.raf) cancelAnimationFrame(S.raf);
      S.raf = 0;
      A.kick = noop;
      A.caret = noop;
      // Leave the glass at rest.
      shell.style.setProperty("--gf-lo", "0");
      rip.style.backgroundImage = "none";
      bezel.style.boxShadow = BEZEL_REST;
      rest.style.setProperty("-webkit-backdrop-filter", REST_GLASS);
      rest.style.backdropFilter = REST_GLASS;
    };
  }, [multiline, type, disabled, dark, restId]);

  // An error clouds the glass once: the frost thickens, holds, then clears.
  // Only when a message arrives or changes, never on mount.
  useEffect(() => {
    const el = cloudRef.current;
    const prev = lastError.current;
    lastError.current = error;
    if (!el || !error || error === prev || typeof el.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.style.visibility = "visible";
    el.animate(
      [
        { opacity: 0, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        { opacity: 1, offset: 0.3 },
        { opacity: 1, offset: 0.42, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
        { opacity: 0 },
      ],
      { duration: 900 }
    );
    // Ended by a timer of the same length, not the finish event, which only
    // fires on a rendered frame.
    window.clearTimeout(cloudTimer.current);
    cloudTimer.current = window.setTimeout(() => {
      el.style.visibility = "hidden";
    }, 920);
  }, [error]);

  /** Grow the deep pane from the origin, or drain it back there. */
  function bloom(open: boolean) {
    const el = thickRef.current;
    const shell = shellRef.current;
    if (!el || !shell) return;
    const w = shell.offsetWidth;
    const h = shell.offsetHeight;
    const o = origin.current;
    if (open && !o.fromPointer) {
      // Arriving by keyboard: start where the text starts.
      o.x = 22;
      o.y = multiline ? 30 : h / 2;
    }
    o.fromPointer = false;
    const at = " at " + o.x.toFixed(1) + "px " + o.y.toFixed(1) + "px)";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (open) {
      const r = Math.hypot(Math.max(o.x, w - o.x), Math.max(o.y, h - o.y)) + 2;
      el.style.transition = "none";
      el.style.clipPath = "circle(0px" + at;
      // Commit the starting circle, so the transition grows from the origin.
      el.getBoundingClientRect();
      el.style.transition = reduce ? "none" : "clip-path 440ms cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.clipPath = "circle(" + r.toFixed(1) + "px" + at;
    } else {
      el.style.transition = reduce ? "none" : "clip-path 340ms cubic-bezier(0.4, 0, 1, 1)";
      el.style.clipPath = "circle(0px" + at;
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const shell = shellRef.current;
    if (!shell || disabled) return;
    // Layout pixels, even inside a transform-scaled container.
    const r = shell.getBoundingClientRect();
    const k = shell.offsetWidth / (r.width || 1);
    origin.current = { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, fromPointer: true };
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (value === undefined) setTyped(e.target.value !== "");
    onChange?.(e.target.value);
  }

  const rgb = error ? "255,69,58" : rgbOf(tint);
  const restFill = rgb ? "rgba(" + rgb + ",0.08)" : dark ? "rgba(18,18,24,0.22)" : "rgba(255,255,255,0.3)";
  const thickFill = rgb ? "rgba(" + rgb + ",0.14)" : dark ? "rgba(18,18,24,0.26)" : "rgba(255,255,255,0.5)";
  const cloudFilter = "blur(26px) saturate(125%) brightness(" + (dark ? 1.14 : 1.06) + ")";
  const ink = dark ? "#ffffff" : "#111111";
  const ringMask = "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)";
  // The error replaces the hint on screen, so it replaces it here too.
  const describedBy = error ? fieldId + "-error" : hint ? fieldId + "-hint" : undefined;

  const fieldCls =
    "relative z-10 block w-full resize-none bg-transparent px-5 text-[16px] leading-6 outline-none " +
    "placeholder:opacity-0 focus:placeholder:opacity-45 disabled:cursor-not-allowed " +
    "[&:-webkit-autofill]:[-webkit-text-fill-color:currentColor] [&:-webkit-autofill]:[transition:background-color_600000s_0s] " +
    (multiline ? "pb-3 pt-7" : "h-[58px] pb-2 pt-[22px]");
  const common = {
    id: fieldId,
    name,
    value,
    defaultValue,
    placeholder,
    required,
    disabled,
    autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    onChange: handleChange,
    onFocus: () => {
      setFocused(true);
      bloom(true);
      api.current.focused = true;
      api.current.caret();
    },
    onBlur: () => {
      setFocused(false);
      bloom(false);
      api.current.focused = false;
      api.current.kick();
    },
    className: fieldCls,
    style: { color: ink },
  };

  return (
    <div className={"w-full " + className} style={{ opacity: disabled ? 0.5 : 1 }}>
      <div ref={shellRef} className="relative isolate" style={{ borderRadius: radius }} onPointerDown={onPointerDown}>
        {/* Thin, nearly clear glass at rest. It thickens as the pointer nears. */}
        <span
          ref={restRef}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: radius,
            background: restFill,
            backdropFilter: REST_GLASS,
            WebkitBackdropFilter: REST_GLASS,
          }}
        />
        {/* The deep pane: it blooms from the focus origin (clip-path). */}
        <span
          ref={thickRef}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: radius,
            background: thickFill,
            backdropFilter: thickBase,
            WebkitBackdropFilter: thickBase,
            clipPath: "circle(0px at 22px 50%)",
          }}
        />
        {/* Frost for the error's clouding. Hidden until it plays. */}
        <span
          ref={cloudRef}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: radius,
            opacity: 0,
            visibility: "hidden",
            background:
              "radial-gradient(120% 160% at 50% 50%, rgba(255,255,255," + (dark ? 0.16 : 0.34) + "), rgba(255,255,255," +
              (dark ? 0.06 : 0.16) + ") 70%), rgba(255,69,58," + (dark ? 0.12 : 0.08) + ")",
            backdropFilter: cloudFilter,
            WebkitBackdropFilter: cloudFilter,
          }}
        />
        {/* The bezel band inside the rim (thickened by the loop). */}
        <span
          ref={bezelRef}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: radius,
            boxShadow: BEZEL_REST,
          }}
        />
        {/* Keystroke ripples, drawn behind the text. */}
        <span ref={rippleRef} aria-hidden className="pointer-events-none absolute inset-0" style={{ borderRadius: radius }} />
        {/* A soft specular in the face, under the light. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: radius,
            opacity: "calc(var(--gf-lo, 0) * 0.8)",
            background:
              "radial-gradient(220px circle at var(--gf-lx, -999px) var(--gf-ly, -999px), rgba(255,255,255," +
              (dark ? 0.1 : 0.28) + "), rgba(255,255,255,0) 65%)",
            mixBlendMode: dark ? "screen" : "normal",
          }}
        />
        {/* Rim: graduated at rest, brighter and closed all round while focused. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-shadow duration-[240ms]"
          style={{
            borderRadius: radius,
            boxShadow: focused
              ? "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(255,255,255,0.32), inset 0 0 0 1.5px rgba(255,255,255," +
                (dark ? 0.55 : 0.85) + "), 0 12px 40px rgba(0,0,0," + (dark ? 0.28 : 0.12) + ")"
              : "inset 0 1px 0 rgba(255,255,255," + (dark ? 0.45 : 0.8) + "), inset 0 -1px 0 rgba(255,255,255,0.14), 0 8px 28px rgba(0,0,0," +
                (dark ? 0.16 : 0.08) + ")",
          }}
        />
        {/* The rim's light: the stretch nearest the pointer (or the caret) brightens. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: radius,
            padding: 1.5,
            opacity: "var(--gf-lo, 0)",
            background:
              "radial-gradient(150px circle at var(--gf-lx, -999px) var(--gf-ly, -999px), rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)",
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            mask: ringMask,
          }}
        />
        <label
          htmlFor={fieldId}
          className="pointer-events-none absolute left-5 z-20 origin-left font-semibold tracking-[-0.01em] transition-[transform,opacity] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            top: multiline ? 17 : 19,
            fontSize: 15,
            lineHeight: "20px",
            color: ink,
            opacity: floated ? 0.72 : 0.62,
            transform: floated ? "translateY(-10px) scale(0.76)" : "none",
          }}
        >
          {label}
          {required && <span aria-hidden> *</span>}
        </label>
        {multiline ? <textarea rows={rows} {...common} /> : <input type={type} {...common} />}
        {/* A hidden copy of the text before the caret, to find the caret. */}
        <div
          ref={mirrorRef}
          aria-hidden
          className={
            "pointer-events-none invisible absolute left-0 top-0 px-5 text-[16px] leading-6 " + (multiline ? "w-full pb-3 pt-7" : "pt-[22px]")
          }
          style={{ whiteSpace: multiline ? "pre-wrap" : "pre", overflowWrap: multiline ? "break-word" : "normal" }}
        />
        <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
          <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage ref={mapRef} x="0" y="0" preserveAspectRatio="none" result="map" />
            <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id={restId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage ref={restMapRef} x="0" y="0" preserveAspectRatio="none" result="map" />
            <feDisplacementMap ref={restDispRef} in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      </div>
      <div aria-live="polite">
        {error ? (
          <p id={fieldId + "-error"} className="mt-2 flex items-center gap-1.5 px-5 text-[13px] font-semibold" style={{ color: dark ? "#ffd2cf" : "#b3261e" }}>
            <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="currentColor">
              <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm-.75 3.5h1.5v4.5h-1.5V5Zm0 5.5h1.5V12h-1.5v-1.5Z" />
            </svg>
            {error}
          </p>
        ) : null}
      </div>
      {hint && !error && (
        <p id={fieldId + "-hint"} className="mt-2 px-5 text-[13px]" style={{ color: ink, opacity: 0.6 }}>
          {hint}
        </p>
      )}
    </div>
  );
}
