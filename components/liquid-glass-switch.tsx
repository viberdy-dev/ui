"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

/**
 * LiquidGlassSwitch — a toggle whose knob turns to glass while you hold it.
 *
 * At rest the knob is a solid white pill. Press or drag and it swells into a
 * clear lens: the white drains away, a rim and a sheen appear, and the track
 * underneath shows through MAGNIFIED, because the knob carries an aligned
 * copy of the track and the whole knob is scaled up around its own centre.
 * In Chromium a displacement map then bends that copy at the knob's rim, so
 * the edge of the colour fill curves as it passes under the glass. It runs as
 * a CSS filter on the copy, applied only where an image-driven displacement
 * filter on HTML is verified; Safari and Firefox keep the magnified copy with
 * a straight edge.
 *
 * Drag it across and the fill follows the knob; let go past the middle and it
 * commits, springing into place. A tap toggles. Space and Enter toggle too,
 * with the same brief glass flash. role="switch" with aria-checked; the label
 * is part of the control.
 *
 * Controlled (checked + onCheckedChange) or uncontrolled (defaultChecked).
 * Needs Tailwind v4 (or v3.4+). No dependencies beyond React.
 */

type Size = "md" | "lg";
type Geom = { w: number; h: number; kw: number; kh: number; pad: number };

const SIZES: Record<Size, Geom> = {
  md: { w: 64, h: 28, kw: 38, kh: 24, pad: 2 },
  lg: { w: 80, h: 36, kw: 48, kh: 30, pad: 3 },
};

const SPRING = "460ms cubic-bezier(0.34,1.4,0.64,1)";

/** Only "#rrggbb" is accepted; anything else falls back. Never interpolated raw. */
function safeHex(hex: string | undefined, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex || "") ? (hex as string) : fallback;
}

/**
 * The knob's lens as a displacement map: red carries the x offset and green
 * the y offset (128 = none), pointing inward and growing toward the rim.
 */
function lensMap(w: number, h: number, r: number, bezel: number): string {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, h);
  const hw = w / 2;
  const hh = h / 2;
  const sd = (x: number, y: number) => {
    const qx = Math.abs(x) - (hw - r);
    const qy = Math.abs(y) - (hh - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };
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

type Fill = "on" | "off" | "drag";

/** Fully open when on, closed when off, and running to the knob's centre while dragged. */
function clipFor(g: Geom, x: number, fill: Fill): string {
  if (fill === "on") return "inset(0 0 0 0 round 999px)";
  if (fill === "off") return "inset(0 100% 0 0 round 999px)";
  return "inset(0 " + (g.w - (x + g.kw / 2)) + "px 0 0 round 999px)";
}

type Parts = {
  knob: RefObject<HTMLSpanElement | null>;
  clone: RefObject<HTMLSpanElement | null>;
  fill: RefObject<HTMLSpanElement | null>;
  cloneFill: RefObject<HTMLSpanElement | null>;
};

/** Move the knob, its magnified copy of the track, and both fills. DOM only. */
function placeKnob(p: Parts, g: Geom, x: number, animate: boolean, fill: Fill) {
  const knob = p.knob.current;
  const clone = p.clone.current;
  if (knob) {
    knob.style.transition = (animate ? "transform " + SPRING : "none") + ", box-shadow 200ms ease";
    knob.style.transform = "translateX(" + x + "px) scale(var(--lgs-scale))";
  }
  if (clone) {
    clone.style.transition = animate ? "left " + SPRING : "none";
    clone.style.left = -x + "px";
  }
  for (const f of [p.fill.current, p.cloneFill.current]) {
    if (!f) continue;
    f.style.transition = animate ? "clip-path " + SPRING : "none";
    f.style.clipPath = clipFor(g, x, fill);
  }
}

export function LiquidGlassSwitch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  label,
  tint = "#34c759",
  size = "md",
  disabled = false,
  labelSide = "end",
  className = "",
}: {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Visible label, clickable, and the switch's accessible name. */
  label?: string;
  /** "On" colour, "#rrggbb". */
  tint?: string;
  size?: Size;
  disabled?: boolean;
  /** Label after the switch ("end") or before it, settings-row style ("start"). */
  labelSide?: "start" | "end";
  className?: string;
}) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  const g = SIZES[size];
  const fillColour = safeHex(tint, "#34c759");
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const labelId = "lgs" + uid;
  const lensId = "lgsl" + uid;
  const mapRef = useRef<SVGFEImageElement>(null);

  const rootRef = useRef<HTMLButtonElement>(null);
  const knob = useRef<HTMLSpanElement>(null);
  const clone = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const cloneFill = useRef<HTMLSpanElement>(null);
  const lensWrap = useRef<HTMLSpanElement>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, from: 0, x: 0, id: -1, k: 1 });
  const flashTimer = useRef(0);

  const minX = g.pad;
  const maxX = g.w - g.kw - g.pad;
  const restX = on ? maxX : minX;

  // Keep the knob in the committed position whenever the value changes.
  useEffect(() => {
    if (!drag.current.active) {
      placeKnob({ knob, clone, fill, cloneFill }, SIZES[size], on ? maxX : minX, true, on ? "on" : "off");
    }
  }, [on, size, maxX, minX]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  // The knob's lens map, built once per size (it only depends on the knob),
  // and switched on only in Chromium.
  useEffect(() => {
    const k = SIZES[size];
    mapRef.current?.setAttribute("href", lensMap(k.kw, k.kh, k.kh / 2, Math.min(k.kh * 0.34, 9)));
    const ua = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData;
    if (lensWrap.current && ua && ua.brands && ua.brands.some((b) => /Chromium/.test(b.brand))) {
      lensWrap.current.style.filter = "url(#" + lensId + ")";
    }
  }, [size, lensId]);

  function setHeld(held: boolean) {
    rootRef.current?.setAttribute("data-held", held ? "true" : "false");
  }
  function commit(next: boolean) {
    if (checked === undefined) setInner(next);
    onCheckedChange?.(next);
  }
  /** Tap, label click or keyboard: a brief glass flash while the knob travels. */
  function toggleWithFlash() {
    if (disabled) return;
    setHeld(true);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setHeld(false), 280);
    commit(!on);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    const d = drag.current;
    d.active = true;
    d.moved = false;
    d.startX = e.clientX;
    d.from = restX;
    d.x = restX;
    d.id = e.pointerId;
    // Screen pixels to layout pixels, so dragging tracks inside a scaled container.
    const r = e.currentTarget.getBoundingClientRect();
    d.k = e.currentTarget.offsetWidth / (r.width || 1);
    e.currentTarget.setPointerCapture(e.pointerId);
    setHeld(true);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    const dx = (e.clientX - d.startX) * d.k;
    if (Math.abs(dx) > 3) d.moved = true;
    d.x = Math.max(minX, Math.min(maxX, d.from + dx));
    placeKnob({ knob, clone, fill, cloneFill }, g, d.x, false, "drag");
  }
  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.active = false;
    setHeld(false);
    // A drag commits by position; a tap is left to onClick.
    if (d.moved) {
      const next = d.x > (minX + maxX) / 2;
      placeKnob({ knob, clone, fill, cloneFill }, g, next ? maxX : minX, true, next ? "on" : "off");
      if (next !== on) commit(next);
    }
  }
  function onPointerCancel(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.active = false;
    d.moved = false;
    setHeld(false);
    placeKnob({ knob, clone, fill, cloneFill }, g, restX, true, on ? "on" : "off");
  }
  function onClick() {
    // The click that follows a drag has already been handled by position.
    if (drag.current.moved) {
      drag.current.moved = false;
      return;
    }
    toggleWithFlash();
  }

  const offTrack = "rgba(120,120,128,0.36)";
  const track = (ref: RefObject<HTMLSpanElement | null>) => (
    <>
      <span className="absolute inset-0 rounded-full" style={{ background: offTrack }} />
      <span
        ref={ref}
        className="absolute inset-0 rounded-full"
        style={{ background: fillColour, clipPath: clipFor(g, restX, on ? "on" : "off") }}
      />
    </>
  );

  return (
    <span className={"inline-flex items-center gap-3 " + (labelSide === "start" ? "flex-row-reverse " : "") + className}>
      <button
        ref={rootRef}
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={label ? labelId : undefined}
        disabled={disabled}
        data-held="false"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={onClick}
        className={
          "group relative shrink-0 touch-none select-none rounded-full outline-none " +
          "focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/0 " +
          "disabled:cursor-not-allowed disabled:opacity-40 " +
          "[--lgs-scale:1] data-[held=true]:[--lgs-scale:1.32] motion-reduce:data-[held=true]:[--lgs-scale:1]"
        }
        style={{ width: g.w, height: g.h }}
      >
        {track(fill)}
        <span
          ref={knob}
          aria-hidden
          className="absolute left-0 overflow-hidden rounded-full"
          style={{
            top: (g.h - g.kh) / 2,
            width: g.kw,
            height: g.kh,
            transform: "translateX(" + restX + "px) scale(var(--lgs-scale))",
            boxShadow: "0 2px 7px rgba(0,0,0,0.28), 0 0 0 0.5px rgba(0,0,0,0.06)",
          }}
        >
          {/* The track again, aligned under the knob: scaled with it, it reads as
              magnified, and (in Chromium) the lens map bends it at the rim. */}
          <span ref={lensWrap} className="absolute inset-0">
            <span
              ref={clone}
              className="absolute"
              style={{ left: -restX, top: -(g.h - g.kh) / 2, width: g.w, height: g.h }}
            >
              {track(cloneFill)}
            </span>
          </span>
          {/* Glass: a faint body, a graduated rim and a sheen along the top. */}
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.1) 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 1px rgba(255,255,255,0.3), inset 0 0 6px rgba(255,255,255,0.3)",
            }}
          />
          {/* The solid white knob, which drains away while held. */}
          <span className="absolute inset-0 rounded-full bg-white transition-opacity duration-200 group-data-[held=true]:opacity-0" />
        </span>
        <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
          <filter id={lensId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage ref={mapRef} x="0" y="0" width={g.kw} height={g.kh} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale="12" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      </button>
      {label && (
        <span
          id={labelId}
          onClick={toggleWithFlash}
          className={"select-none text-[15px] " + (disabled ? "opacity-40" : "cursor-pointer")}
        >
          {label}
        </span>
      )}
    </span>
  );
}
