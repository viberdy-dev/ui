"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * GlassEtchText — a headline made of glass.
 *
 * The letters stay real, selectable HTML text; an SVG filter replaces how they
 * are painted. Each glyph becomes a clear pane with a faint body, a bevel lit
 * from one direction (bright on the edges that face the light, shadowed on
 * the far walls), a thin rim that is graduated rather than a uniform outline,
 * and a colour fringe no wider than a pixel or two that lives only in the rim
 * band, the way a real edge splits light. Whatever sits behind shows through
 * the letters.
 *
 * Two cuts:
 * - "raised": glass letters standing on the page, with a soft shadow cast
 *   away from the light.
 * - "etched": letters cut INTO a glass surface: the wall facing the light
 *   falls into shadow and the far wall catches it.
 *
 * The filter is a plain CSS filter: url(), which Chrome, Safari and Firefox
 * all run on HTML. Every length in it scales with the element's computed font
 * size, so it holds from 40px to 240px and with fluid clamp() type.
 *
 * Needs Tailwind v4 (or v3.4+). No dependencies beyond React.
 */

type Cut = "raised" | "etched";

/** "#rrggbb" if valid, otherwise the fallback. Never interpolated unchecked. */
function safeHex(hex: string | undefined, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex || "") ? (hex as string) : fallback;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function GlassEtchText({
  children,
  as: Tag = "h2",
  size = 120,
  weight = 700,
  cut = "raised",
  light = 225,
  tint,
  fringe = 0.5,
  className = "",
  style,
}: {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  /** Font size: px, or any CSS length such as "clamp(48px, 9vw, 160px)". */
  size?: number | string;
  /** Glass needs body: 600 or heavier reads best. */
  weight?: number;
  cut?: Cut;
  /** Where the light comes from, in degrees: 0 right, 90 below, 180 left, 270 above. 225 is the upper left. */
  light?: number;
  /** Colour of the glass body, "#rrggbb". Default clear. */
  tint?: string;
  /** Strength of the colour fringe at the rim, 0–1. */
  fringe?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const id = "get" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [px, setPx] = useState(typeof size === "number" ? size : 96);

  // The filter is drawn in the element's own pixels, so its lengths follow
  // the real, computed font size (fluid type changes it on resize).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const v = parseFloat(getComputedStyle(el).fontSize);
      if (v > 0) setPx(Math.round(v));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const body = safeHex(tint, "#ffffff");
  const f = Math.max(0, Math.min(1, fringe));
  // A non-number from a CMS or URL param falls back to the upper left.
  const deg = Number.isFinite(light) ? (((light % 360) + 360) % 360) : 225;
  const az = deg * (Math.PI / 180);
  // Unit vector pointing TOWARD the light (y down).
  const lx = Math.cos(az);
  const ly = Math.sin(az);
  const raised = cut === "raised";

  const bevel = r2(Math.max(0.8, px * 0.035));
  const surface = r2(Math.max(1, px * 0.05));
  const d = Math.max(0.6, px * 0.018);
  const rimW = r2(Math.max(0.5, px * 0.009));
  const split = r2(Math.min(3, Math.max(0.5, px * 0.007)));
  // The inner shadow: the outside of the glyph, shifted so it lands on the
  // far wall (raised) or on the wall facing the light (etched).
  const inX = r2((raised ? lx : -lx) * d);
  const inY = r2((raised ? ly : -ly) * d);
  // Probes for which rim faces the light: sample one rim-width toward it.
  const pX = r2(-lx * rimW * 1.5);
  const pY = r2(-ly * rimW * 1.5);

  return (
    <Tag
      ref={(n: HTMLElement | null) => {
        ref.current = n;
      }}
      className={"relative m-0 leading-[0.95] tracking-[-0.03em] " + className}
      style={{
        fontSize: size,
        fontWeight: weight,
        // Opaque, so the filter's source alpha is exactly the glyph shapes.
        color: "#ffffff",
        filter: "url(#" + id + ")",
        ...style,
      }}
    >
      {children}
      <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="-8%" y="-25%" width="116%" height="150%" colorInterpolationFilters="sRGB">
          {/* Height map: the glyph's alpha, softened into a bevel. */}
          <feGaussianBlur in="SourceAlpha" stdDeviation={bevel} result="h" />
          <feComponentTransfer in="SourceAlpha" result="inv">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur in="inv" stdDeviation={bevel} result="hInv" />
          {/* Specular on the bevel: convex for raised, concave for etched. */}
          <feSpecularLighting
            in={raised ? "h" : "hInv"}
            surfaceScale={surface}
            specularConstant="1.15"
            specularExponent="24"
            lightingColor="#ffffff"
            result="sp"
          >
            <feDistantLight azimuth={deg} elevation="48" />
          </feSpecularLighting>
          <feComposite in="sp" in2="SourceAlpha" operator="in" result="spec" />
          {/* Inner shadow on the far wall (raised) or the near wall (etched). */}
          <feOffset in="hInv" dx={inX} dy={inY} result="invOff" />
          <feFlood floodColor="#0a0614" floodOpacity={raised ? 0.42 : 0.55} />
          <feComposite in2="invOff" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="inner" />
          {/* The body: faint, so what is behind shows through. */}
          <feFlood floodColor={body} floodOpacity={raised ? 0.12 : 0.2} />
          <feComposite in2="SourceAlpha" operator="in" result="fill" />
          {/* The rim band, then the part of it facing the light. */}
          <feMorphology in="SourceAlpha" operator="erode" radius={rimW} result="core" />
          <feComposite in="SourceAlpha" in2="core" operator="out" result="edge" />
          <feOffset in="SourceAlpha" dx={pX} dy={pY} result="probe" />
          <feComposite in="edge" in2="probe" operator="out" result="edgeLit" />
          <feComposite in="edge" in2="edgeLit" operator="out" result="edgeFar" />
          <feFlood floodColor="#ffffff" floodOpacity={raised ? 0.85 : 0.1} />
          <feComposite in2="edgeLit" operator="in" result="rimLit" />
          <feFlood floodColor="#ffffff" floodOpacity={raised ? 0.16 : 0.6} />
          <feComposite in2="edgeFar" operator="in" result="rimFar" />
          {/* Dispersion: red and blue split by a pixel or two, rim band only,
              and only where the two copies part (the sides of a stroke), so
              horizontal edges never get a uniform tinted outline. */}
          <feOffset in="edge" dx={split} dy="0" result="er" />
          <feOffset in="edge" dx={-split} dy="0" result="eb" />
          <feComposite in="er" in2="eb" operator="out" result="erOnly" />
          <feComposite in="eb" in2="er" operator="out" result="ebOnly" />
          <feFlood floodColor="#ff3d7f" floodOpacity={r2(0.7 * f)} />
          <feComposite in2="erOnly" operator="in" result="fr" />
          <feFlood floodColor="#33c4ff" floodOpacity={r2(0.7 * f)} />
          <feComposite in2="ebOnly" operator="in" result="fb" />
          {/* Raised glass casts a soft shadow away from the light. */}
          <feGaussianBlur in="SourceAlpha" stdDeviation={r2(px * 0.05)} />
          <feOffset dx={r2(-lx * d * 1.8)} dy={r2(-ly * d * 1.8)} result="ds" />
          <feFlood floodColor="#000000" floodOpacity={raised ? 0.24 : 0} />
          <feComposite in2="ds" operator="in" />
          <feComposite in2="SourceAlpha" operator="out" result="drop" />
          <feMerge>
            <feMergeNode in="drop" />
            <feMergeNode in="fill" />
            <feMergeNode in="inner" />
            <feMergeNode in="fr" />
            <feMergeNode in="fb" />
            <feMergeNode in="rimFar" />
            <feMergeNode in="rimLit" />
            <feMergeNode in="spec" />
          </feMerge>
        </filter>
      </svg>
    </Tag>
  );
}
