"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

/**
 * GlassMorphPopover — a popover that grows out of its trigger as a drop of
 * liquid glass and settles into a flat panel.
 *
 * Open it and a capsule the width of the button leaves the trigger, pulled
 * through a short glass neck, stretches toward where the panel will sit, then
 * spreads into the panel's rounded rectangle and settles with a little
 * spring. The content arrives as the shape lands. Close it and the panel
 * drains back into the button along the same path.
 *
 * Following the glass rule that glass never fades in, the material appears by
 * SHAPE (a clip-path morph) and, in Chromium, by ramping its refraction from
 * zero: a displacement map sized to the panel bends the backdrop at its rim,
 * and its strength climbs as the panel opens. Safari and Firefox get the
 * same morph with blur, saturation and the graduated rim.
 *
 * A non-modal dialog: the trigger carries aria-expanded and aria-controls,
 * the panel takes focus when it opens, Escape closes it and returns focus to
 * the trigger, and a press outside closes it. Under prefers-reduced-motion it
 * simply appears and disappears. Controlled (open + onOpenChange) or not
 * (defaultOpen). The panel is positioned inside the trigger's wrapper, so
 * keep the wrapper out of overflow-hidden ancestors. Once settled, a light
 * follows the pointer across the panel's rim. Animating a clip-path on an
 * element with backdrop-filter is smooth in Chromium; check it in Safari if
 * your audience is Safari-heavy.
 *
 * Needs Tailwind v4 (or v3.4+). No dependencies beyond React.
 */

type Tone = "dark" | "light";
type Placement = "bottom" | "top";
type Align = "start" | "center" | "end";

const GAP = 12;
const RADIUS = 28;

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
  const sd = (x: number, y: number) => {
    const qx = Math.abs(x) - (hw - rr);
    const qy = Math.abs(y) - (hh - rr);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
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

/**
 * A light that eases after the pointer (about 180ms) and fades when it
 * leaves. Writes <prefix>x and <prefix>y (layout pixels) and <prefix>o on the
 * element; the loop sleeps once the light arrives. Returns a cleanup.
 */
function followPointer(el: HTMLElement, prefix: string): () => void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const L = { x: 0, y: 0, tx: 0, ty: 0, o: 0, to: 0, raf: 0, last: 0, placed: false };
  function step(now: number) {
    L.raf = 0;
    const dt = L.last ? Math.min(1 / 30, (now - L.last) / 1000) : 1 / 60;
    L.last = now;
    const kp = reduce.matches ? 1 : 1 - Math.exp(-dt / 0.18);
    const ko = reduce.matches ? 1 : 1 - Math.exp(-dt / 0.22);
    L.x += (L.tx - L.x) * kp;
    L.y += (L.ty - L.y) * kp;
    L.o += (L.to - L.o) * ko;
    el.style.setProperty(prefix + "x", L.x.toFixed(1) + "px");
    el.style.setProperty(prefix + "y", L.y.toFixed(1) + "px");
    el.style.setProperty(prefix + "o", L.o.toFixed(3));
    if (Math.abs(L.tx - L.x) > 0.3 || Math.abs(L.ty - L.y) > 0.3 || Math.abs(L.to - L.o) > 0.004) {
      L.raf = requestAnimationFrame(step);
    } else L.last = 0;
  }
  const kick = () => {
    if (!L.raf) L.raf = requestAnimationFrame(step);
  };
  function onMove(e: PointerEvent) {
    // Layout pixels, even inside a transform-scaled container.
    const r = el.getBoundingClientRect();
    const k = el.offsetWidth / (r.width || 1);
    L.tx = (e.clientX - r.left) * k;
    L.ty = (e.clientY - r.top) * k;
    L.to = 1;
    if (!L.placed) {
      L.x = L.tx;
      L.y = L.ty;
      L.placed = true;
    }
    kick();
  }
  function onLeave() {
    L.to = 0;
    kick();
  }
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerdown", onMove);
  el.addEventListener("pointerleave", onLeave);
  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerdown", onMove);
    el.removeEventListener("pointerleave", onLeave);
    if (L.raf) cancelAnimationFrame(L.raf);
  };
}

/** A clip-path capsule of width w and height h, centred on x, hanging from the top (or rising from the bottom). */
function capsule(pw: number, ph: number, x: number, w: number, h: number, fromTop: boolean, r: number): string {
  const left = Math.max(0, x - w / 2);
  const right = Math.max(0, pw - (x + w / 2));
  const top = fromTop ? 0 : Math.max(0, ph - h);
  const bottom = fromTop ? Math.max(0, ph - h) : 0;
  return "inset(" + top.toFixed(1) + "px " + right.toFixed(1) + "px " + bottom.toFixed(1) + "px " + left.toFixed(1) + "px round " + r.toFixed(1) + "px)";
}

export function GlassMorphPopover({
  label,
  icon,
  children,
  title,
  open,
  defaultOpen = false,
  onOpenChange,
  placement = "bottom",
  align = "center",
  width = 320,
  tone = "dark",
  tint,
  refraction = 1,
  className = "",
}: {
  /** The trigger's text. */
  label: string;
  /** Optional icon before the label. */
  icon?: ReactNode;
  /** The panel's content. */
  children: ReactNode;
  /** The dialog's accessible name; defaults to the label. */
  title?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Where the panel opens relative to the trigger. */
  placement?: Placement;
  align?: Align;
  /** Panel width in px. */
  width?: number;
  /** Glass over dark content (white text) or light content (ink text). */
  tone?: Tone;
  /** Optional tint, "#rrggbb", at 12%. */
  tint?: string;
  /** Rim refraction of the panel, 0–2 (Chromium only). */
  refraction?: number;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const panelId = "gmp" + uid;
  const filterId = "gmpl" + uid;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const neckRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<SVGFEImageElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const userOpened = useRef(false);

  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  // Whether the panel is currently settled open. It survives effect re-runs
  // (React development mounts twice; a prop can change while open), so only a
  // real closed-to-open change plays the morph.
  const settled = useRef(isOpen);
  // Keep the panel in the DOM while it drains back into the trigger.
  const [prevOpen, setPrevOpen] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  if (prevOpen !== isOpen) {
    setPrevOpen(isOpen);
    setClosing(!isOpen);
  }
  const visible = isOpen || closing;

  const dark = tone === "dark";
  const base = "blur(18px) saturate(180%) brightness(" + (dark ? 1.08 : 1.04) + ")";
  const rgb = rgbOf(tint);
  const fill = rgb
    ? "linear-gradient(rgba(" + rgb + ",0.12), rgba(" + rgb + ",0.12)), " + (dark ? "rgba(18,18,24,0.34)" : "rgba(255,255,255,0.5)")
    : dark
      ? "rgba(18,18,24,0.36)"
      : "rgba(255,255,255,0.55)";
  const ink = dark ? "#ffffff" : "#111111";

  function setOpen(next: boolean) {
    userOpened.current = next;
    if (open === undefined) setInner(next);
    onOpenChange?.(next);
  }

  // The morph: open grows the droplet out of the trigger; close drains it back.
  // A layout effect, so the panel never paints one full-size frame first.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    const neck = neckRef.current;
    const content = contentRef.current;
    if (!panel || !trigger || !neck || !content) return;
    if (!isOpen && !closing) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lens = isChromium() && refraction > 0;
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    const fromTop = placement === "bottom";
    // The trigger's centre in the panel's own layout pixels.
    const cx = Math.max(0, Math.min(pw, trigger.offsetLeft + trigger.offsetWidth / 2 - panel.offsetLeft));
    const tw = Math.min(pw, trigger.offsetWidth);
    const th = trigger.offsetHeight;
    // Refraction up to 1 strengthens the bend; above 1 it widens the bent
    // band instead, so the peak offset never passes 0.4 of the bezel.
    const bezel = Math.min(Math.min(24, Math.max(14, Math.min(pw, ph) * 0.08)) * Math.max(1, refraction), Math.min(pw, ph) * 0.3);
    const peak = Math.round(0.8 * bezel * Math.min(1, refraction));
    if (lens && mapRef.current && dispRef.current && pw && ph) {
      mapRef.current.setAttribute("href", lensMap(pw, ph, RADIUS, bezel));
      mapRef.current.setAttribute("width", String(pw));
      mapRef.current.setAttribute("height", String(ph));
      panel.style.backdropFilter = "url(#" + filterId + ") " + base;
    }

    const shapes = [
      capsule(pw, ph, cx, tw, th * 0.9, fromTop, th * 0.45),
      capsule(pw, ph, cx, Math.max(56, tw * 0.72), ph * 0.58, fromTop, Math.max(28, tw * 0.36)),
      "inset(0px 0px 0px 0px round " + RADIUS + "px)",
    ];
    const anims: Animation[] = [];
    let raf = 0;
    let timer = 0;
    const ramp = (from: number, to: number, ms: number) => {
      if (!lens || !dispRef.current) return;
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / ms);
        dispRef.current?.setAttribute("scale", String(Math.round(from + (to - from) * k)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (isOpen) {
      const wasSettled = settled.current;
      settled.current = true;
      if (wasSettled || reduce) {
        // Already open (on mount, or a prop changed), or no motion wanted.
        content.style.opacity = "1";
        dispRef.current?.setAttribute("scale", String(peak));
      } else {
        anims.push(
          panel.animate(
            [
              { clipPath: shapes[0], easing: "cubic-bezier(0.3, 0, 0.2, 1)" },
              { clipPath: shapes[1], offset: 0.42, easing: "cubic-bezier(0.34, 1.4, 0.64, 1)" },
              { clipPath: shapes[2] },
            ],
            // "backwards" only: once settled the clip lets go, so the
            // panel's shadow is not clipped away.
            { duration: 320, fill: "backwards" }
          ),
          neck.animate(
            [
              { transform: "scale(0.2, 0)", opacity: 1 },
              { transform: "scale(1, 1)", opacity: 1, offset: 0.35 },
              { transform: "scale(0.3, 0)", opacity: 1 },
            ],
            { duration: 300, easing: "cubic-bezier(0.3, 0, 0.2, 1)", fill: "both" }
          ),
          content.animate(
            [
              { opacity: 0, transform: "translateY(" + (fromTop ? -6 : 6) + "px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 200, delay: 140, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }
          )
        );
        ramp(0, peak, 320);
      }
      // Take focus only when a person just opened it, never on a re-run.
      if (!wasSettled && userOpened.current) panel.focus({ preventScroll: true });
      userOpened.current = false;
    } else if (closing) {
      settled.current = false;
      const done = () => setClosing(false);
      if (reduce) {
        done();
      } else {
        // End on a timer, not on the animation's finish event, which only
        // fires on a rendered frame and can stall in a throttled tab.
        timer = window.setTimeout(done, 250);
        anims.push(
          content.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, easing: "linear", fill: "both" }),
          panel.animate(
            [
              { clipPath: shapes[2] },
              { clipPath: shapes[1], offset: 0.5 },
              { clipPath: shapes[0] },
            ],
            { duration: 240, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" }
          )
        );
        ramp(peak, 0, 200);
      }
    }
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      anims.forEach((a) => a.cancel());
    };
  }, [isOpen, closing, placement, refraction, base, filterId]);

  // A light that follows the pointer across the settled panel.
  useEffect(() => {
    const panel = panelRef.current;
    return panel ? followPointer(panel, "--gmp-l") : undefined;
  }, []);

  // Outside press and Escape.
  useEffect(() => {
    if (!isOpen) return;
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  });

  function onPanelKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const glass = {
    background: fill,
    backdropFilter: base,
    WebkitBackdropFilter: base,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255," + (dark ? 0.55 : 0.9) + "), inset 0 -1px 0 rgba(255,255,255,0.18), 0 12px 40px rgba(0,0,0," + (dark ? 0.28 : 0.14) + ")",
  };
  const left = align === "start" ? 0 : align === "end" ? undefined : "calc(50% - " + width / 2 + "px)";

  return (
    <div ref={rootRef} className={"relative inline-block " + className}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setOpen(!isOpen)}
        className="relative inline-flex h-11 select-none items-center gap-2 rounded-full px-5 text-[15px] font-semibold tracking-[-0.01em] outline-none transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] focus-visible:ring-2 focus-visible:ring-white/80 active:scale-x-[0.98] active:scale-y-[0.97] active:duration-100"
        style={{ ...glass, color: ink }}
      >
        {icon && (
          <span aria-hidden className="flex h-5 w-5 items-center justify-center [&>svg]:h-5 [&>svg]:w-5">
            {icon}
          </span>
        )}
        {label}
      </button>
      {/* The neck: a bead of glass that bridges the gap while the drop leaves. */}
      <span
        ref={neckRef}
        aria-hidden
        className="pointer-events-none absolute z-40 rounded-full"
        style={{
          ...glass,
          width: 18,
          height: GAP + 8,
          left: "calc(50% - 9px)",
          top: placement === "bottom" ? "calc(100% - 4px)" : undefined,
          bottom: placement === "top" ? "calc(100% - 4px)" : undefined,
          transformOrigin: placement === "bottom" ? "50% 0%" : "50% 100%",
          transform: "scale(0.2, 0)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
      />
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label={title || label}
        tabIndex={-1}
        hidden={!visible}
        onKeyDown={onPanelKey}
        className="absolute z-50 overflow-hidden outline-none"
        style={{
          ...glass,
          width,
          borderRadius: RADIUS,
          color: ink,
          left,
          right: align === "end" ? 0 : undefined,
          top: placement === "bottom" ? "calc(100% + " + GAP + "px)" : undefined,
          bottom: placement === "top" ? "calc(100% + " + GAP + "px)" : undefined,
        }}
      >
        {/* A graduated rim: bright top-left, faint through the sides. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: RADIUS,
            padding: 1,
            background:
              "linear-gradient(160deg, rgba(255,255,255," + (dark ? 0.6 : 0.95) + ") 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.22) 100%)",
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
          }}
        />
        {/* The pointer's light: the nearby rim brightens, a soft specular below. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: RADIUS,
            padding: 1,
            opacity: "var(--gmp-lo, 0)",
            background:
              "radial-gradient(220px circle at var(--gmp-lx, -999px) var(--gmp-ly, -999px), rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)",
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: "var(--gmp-lo, 0)",
            background:
              "radial-gradient(320px circle at var(--gmp-lx, -999px) var(--gmp-ly, -999px), rgba(255,255,255," + (dark ? 0.16 : 0.3) + "), rgba(255,255,255,0) 65%)",
            mixBlendMode: dark ? "screen" : "normal",
          }}
        />
        <div ref={contentRef} className="relative z-10 p-4">
          {children}
        </div>
        <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
          <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage ref={mapRef} x="0" y="0" preserveAspectRatio="none" result="map" />
            <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      </div>
    </div>
  );
}
