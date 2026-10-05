"use client";

import { useEffect, useId, useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * LiquidGlassButton — a pill of liquid glass, after Apple's 2025 material:
 * it bends what is behind it rather than just blurring it.
 *
 * Three layers do the work:
 * 1. REFRACTION. In Chromium an SVG displacement map, generated for the
 *    button's exact size, is applied inside backdrop-filter, so the backdrop
 *    visibly curves at the rim like light through a lens. Safari and Firefox
 *    cannot run SVG filters as a backdrop-filter yet; they get blur,
 *    saturation and brightness only, which still reads as glass.
 * 2. RIM. A 1px rim graduated from bright (top) to faint (bottom), plus a
 *    second rim lit from wherever the pointer is.
 * 3. SPECULAR. A soft highlight that follows the pointer across the surface.
 *
 * Press squashes it like gel and it springs back. Keyboard focus gets a
 * visible ring. Glass needs something rich behind it: over a flat colour it
 * is a grey pill, which is a property of glass, not of this component.
 *
 * Needs Tailwind v4 (or v3.4+). No dependencies beyond React.
 */

type Tone = "dark" | "light";
type Surface = "clear" | "frost";
type Size = "md" | "lg";

/** Allow relative paths, fragments, http(s), mailto and tel; anything else becomes "#". */
function safeHref(href: string): string {
  const v = href.replace(/[\t\n\r]/g, "").trim();
  if (v.indexOf(String.fromCharCode(92)) !== -1) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#?]/.test(v) && !/^\/\//.test(v)) return v;
  return "#";
}

/** "#rrggbb" to "r,g,b", or null. Anything else is ignored, never interpolated. */
function rgbOf(hex?: string): string | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
}

/**
 * The displacement map for a rounded rectangle, as a data URL. Red carries
 * the x offset and green the y offset (128 = none). Offsets point inward and
 * grow toward the rim, so the backdrop near the edge is pulled from further
 * in: the magnified, bent edge of a lens.
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
      const d = sd(x, y);
      let dx = 0;
      let dy = 0;
      const t = -d;
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

export function LiquidGlassButton({
  children,
  href,
  onClick,
  tone = "dark",
  surface = "clear",
  size = "md",
  tint,
  refraction = 1,
  icon = true,
  className = "",
}: {
  children: ReactNode;
  /** Renders a link instead of a button. Sanitised. */
  href?: string;
  onClick?: () => void;
  /** Glass over a dark backdrop (white text) or a light one (ink text). */
  tone?: Tone;
  /** "clear" barely blurs, like Apple's clear variant; "frost" blurs more. */
  surface?: Surface;
  size?: Size;
  /** Optional tint, "#rrggbb", mixed in at 15% (20% on light glass). */
  tint?: string;
  /** Refraction strength, 0–2. 0 turns the lens off. */
  refraction?: number;
  /** Trailing arrow that nudges on hover. */
  icon?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLElement | null>(null);
  const filterId = "lg" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const mapRef = useRef<SVGFEImageElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);

  const blur = surface === "frost" ? 14 : 3;
  const base = "blur(" + blur + "px) saturate(185%) brightness(" + (tone === "dark" ? 1.08 : 1.04) + ")";
  const rgb = rgbOf(tint);
  const fill =
    tone === "dark"
      ? rgb
        ? "rgba(" + rgb + ",0.15)"
        : "rgba(10,10,18,0.22)"
      : rgb
        ? "rgba(" + rgb + ",0.2)"
        : "rgba(255,255,255,0.34)";

  // Build the lens for the button's real size, and switch the backdrop filter
  // to the refracting version only where the browser runs SVG filters there.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ua = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData;
    const chromium = !!ua && !!ua.brands && ua.brands.some((b) => /Chromium/.test(b.brand));
    if (!chromium || refraction <= 0) {
      el.style.backdropFilter = base;
      return;
    }
    const apply = () => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (!w || !h || !mapRef.current || !dispRef.current) return;
      // A narrow rim: on a pill this thin a wide bezel would bend the whole
      // surface and the middle would stop reading as clear glass.
      const url = lensMap(w, h, h / 2, Math.min(h * 0.24, 12));
      mapRef.current.setAttribute("href", url);
      mapRef.current.setAttribute("width", String(w));
      mapRef.current.setAttribute("height", String(h));
      dispRef.current.setAttribute("scale", String(Math.round(28 * refraction)));
      el.style.backdropFilter = "url(#" + filterId + ") " + base;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [filterId, base, refraction]);

  // Track the pointer on move AND on press: a tap on a touch screen sends no
  // move first, and the press glow must start under the finger.
  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--lgx", ((e.clientX - r.left) / r.width) * 100 + "%");
    el.style.setProperty("--lgy", ((e.clientY - r.top) / r.height) * 100 + "%");
    el.style.setProperty("--lgo", "1");
  }
  function onPointerLeave(e: ReactPointerEvent<HTMLElement>) {
    e.currentTarget.style.setProperty("--lgo", "0");
  }

  const ink = tone === "dark" ? "#ffffff" : "#111111";
  const style = {
    background: fill,
    backdropFilter: base,
    WebkitBackdropFilter: base,
    color: ink,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255," + (tone === "dark" ? 0.55 : 0.8) + "), inset 0 -1px 0 rgba(255,255,255,0.18), 0 12px 40px rgba(0,0,0," + (tone === "dark" ? 0.28 : 0.12) + ")",
    "--lgx": "30%",
    "--lgy": "0%",
    "--lgo": "0",
  } as CSSProperties;

  const inner = (
    <>
      {/* Pointer-lit rim: a 1px ring, brightest nearest the pointer. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          padding: 1,
          background:
            "radial-gradient(120px circle at var(--lgx) var(--lgy), rgba(255,255,255,calc(0.25 + var(--lgo) * 0.6)), rgba(255,255,255,0.14) 70%)",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
        }}
      />
      {/* Specular: a soft sheen that travels with the pointer. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300"
        style={{
          opacity: "calc(0.35 + var(--lgo) * 0.65)",
          background:
            "radial-gradient(80% 140% at var(--lgx) var(--lgy), rgba(255,255,255,0.28), rgba(255,255,255,0) 60%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Press glow: the light starts under the pointer and spreads while held. */}
      <span
        aria-hidden
        className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 scale-50 rounded-full opacity-0 transition-all duration-200 ease-out group-active:scale-[7] group-active:opacity-100"
        style={{
          left: "var(--lgx)",
          top: "var(--lgy)",
          background: "radial-gradient(closest-side, rgba(255,255,255,0.4), rgba(255,255,255,0))",
        }}
      />
      <span
        className="relative z-10 flex items-center gap-2 font-semibold tracking-[-0.01em]"
        style={{ textShadow: tone === "dark" ? "0 1px 12px rgba(0,0,0,0.4)" : "none" }}
      >
        {children}
        {icon && (
          <span
            aria-hidden
            className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          >
            ↗
          </span>
        )}
      </span>
      <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
        <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage ref={mapRef} x="0" y="0" preserveAspectRatio="none" result="map" />
          <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="map" scale="28" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </>
  );

  const cls =
    "group relative isolate inline-flex select-none items-center justify-center overflow-hidden rounded-full " +
    (size === "lg" ? "h-14 px-7 text-[17px] " : "h-11 px-5 text-[15px] ") +
    "transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] active:scale-x-[0.98] active:scale-y-[0.97] active:duration-100 " +
    "outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent " +
    className;

  if (href) {
    return (
      <a
        ref={(n) => {
          rootRef.current = n;
        }}
        href={safeHref(href)}
        onClick={onClick}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerMove}
        onPointerLeave={onPointerLeave}
        className={cls}
        style={style}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      ref={(n) => {
        rootRef.current = n;
      }}
      type="button"
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cls}
      style={style}
    >
      {inner}
    </button>
  );
}
