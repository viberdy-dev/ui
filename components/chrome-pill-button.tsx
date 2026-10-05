"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * ChromePillButton — a pill of polished chrome that reflects a lit room.
 *
 * A bright sky, a hard dark horizon riding low under the label, a lit floor
 * and a softbox glint. The room turns toward the pointer (the horizon
 * rises and falls, the glint slides, the bezel's light swings round), eased
 * in CSS through registered custom properties, so moving the pointer costs
 * no renders. A press squashes the pill and drops a ring into the surface.
 * "bezel" is the quiet variant: graphite in a chrome rim. Renders a link
 * when given an href, else a button.
 *
 * Part of the Liquid Chrome kit: a graphite room, a four-band chrome ramp
 * (#08090b, #4b4f58, #c9ced6, #ffffff) multiplied by a finish (chrome, gold,
 * rose, cobalt or any #rrggbb), foil colour only as a thin film. Fonts come
 * from CSS variables with Archivo and Geist fallbacks. Respects
 * prefers-reduced-motion. No dependencies beyond React. Paste it as its own
 * file: it repeats the kit's small helpers, which would clash in one module.
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const GROUND = "#0c0d10";

const RAISED = "#1b1c21";

const INK = "rgba(244,245,247,0.94)";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The reflected room, darkest to hottest. Every chrome surface in the kit reflects these four bands. */
const RAMP = ["#08090b", "#4b4f58", "#c9ced6", "#ffffff"] as const;

/** Metal finishes: the colour the room is multiplied by. */
export const LC_FINISHES = {
  chrome: "#ffffff",
  gold: "#f2cf92",
  rose: "#f1bcb4",
  cobalt: "#b9cbff",
} as const;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** A named finish or a #rrggbb tint; anything else falls back to chrome. */
function finishHex(value: string): string {
  if (own(LC_FINISHES, value)) return LC_FINISHES[value];
  return HEX.test(value) ? value : LC_FINISHES.chrome;
}

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A ramp colour multiplied by the finish, as rgb(). */
function tinted(hex: string, tint: string): string {
  const a = rgbOf(hex);
  const b = rgbOf(tint);
  return `rgb(${Math.round((a[0] * b[0]) / 255)} ${Math.round((a[1] * b[1]) / 255)} ${Math.round((a[2] * b[2]) / 255)})`;
}

/** The finished ramp as the CSS variables every chrome gradient and the focus ring read. */
function finishVars(tint: string): CSSProperties {
  return {
    "--lc-0": tinted(RAMP[0], tint),
    "--lc-1": tinted(RAMP[1], tint),
    "--lc-2": tinted(RAMP[2], tint),
    "--lc-3": tinted(RAMP[3], tint),
  } as CSSProperties;
}

/**
 * Chrome as a CSS gradient: bright sky, a hard dark horizon, a lit floor.
 * `--lc-h` moves the horizon (0-100), so a surface can turn in the room.
 */
const CHROME_BG =
  "linear-gradient(180deg, var(--lc-3) 0%, var(--lc-2) calc(var(--lc-h, 50) * 1% - 16%), var(--lc-1) calc(var(--lc-h, 50) * 1% - 2%), var(--lc-0) calc(var(--lc-h, 50) * 1%), var(--lc-1) calc(var(--lc-h, 50) * 1% + 14%), var(--lc-2) calc(var(--lc-h, 50) * 1% + 34%), var(--lc-3) 100%)";

/** Links: strip tabs and newlines, refuse backslashes, allow http(s), mailto, tel and same-site paths. */
function safeHref(raw: string): string {
  const v = raw.replace(/[\t\n\r]/g, "").trim();
  if (!v || v.includes("\\")) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#?]/.test(v) && !/^\/\//.test(v)) return v;
  return "#";
}

// Each part carries only the CSS it needs, so any one of them works on its own.
// Nothing is interpolated into these sheets; colours arrive as CSS variables.
// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".lc-scope :focus-visible,.lc-scope:focus-visible{outline:2px solid var(--lc-2);outline-offset:3px;border-radius:revert-layer}";

// Registered, so the reflection eases in CSS without a render per pointer move.
const PILL_CSS =
  "@property --lc-h{syntax:'<number>';inherits:true;initial-value:50}" +
  "@property --lc-mx{syntax:'<percentage>';inherits:true;initial-value:32%}" +
  "@property --lc-ang{syntax:'<angle>';inherits:true;initial-value:200deg}" +
  ".lc-pill{transition:--lc-h 220ms " + EASE + ",--lc-mx 220ms " + EASE + ",--lc-ang 260ms " + EASE + ",transform 380ms cubic-bezier(0.34,1.56,0.64,1)}" +
  ".lc-pill:active{transform:scale(0.965,0.94);transition-duration:220ms,220ms,260ms,130ms}" +
  "@keyframes lc-drop{from{transform:translate(-50%,-50%) scale(0.2);opacity:0.9}to{transform:translate(-50%,-50%) scale(1);opacity:0}}" +
  "@media (prefers-reduced-motion: reduce){.lc-pill{transition:none}.lc-pill:active{transform:none}.lc-drop{display:none}}";

export type ChromePillButtonProps = {
  children: ReactNode;
  /** Renders a link when set, else a button. */
  href?: string;
  onClick?: () => void;
  /** "chrome": a solid chrome pill (one per view). "bezel": a graphite pill in a chrome rim. */
  variant?: "chrome" | "bezel";
  finish?: string;
  size?: "md" | "lg";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
};

/**
 * A pill of polished chrome that reflects a lit room: a bright sky, a hard
 * dark horizon and a lit floor, with a softbox glint across the top. The
 * room turns toward the pointer (the horizon rises and falls, the glint
 * slides, the rim's light swings round), so the pill reads as metal you are
 * tilting. A press squashes it and drops a ring into the surface.
 */
export function ChromePillButton({
  children,
  href,
  onClick,
  variant = "chrome",
  finish = "chrome",
  size = "md",
  type = "button",
  disabled,
  className,
}: ChromePillButtonProps) {
  const tint = finishHex(finish);
  const ref = useRef<HTMLElement | null>(null);
  const [drops, setDrops] = useState<{ id: number; x: number; y: number }[]>([]);
  const dropId = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let px = 0;
    let py = 0;
    const apply = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // Falls off over a few hundred pixels: near the pill the room turns fully.
      const fx = Math.max(-1, Math.min(1, (px - cx) / Math.max(r.width, 240)));
      const fy = Math.max(-1, Math.min(1, (py - cy) / 220));
      el.style.setProperty("--lc-mx", (50 + fx * 42).toFixed(1) + "%");
      // The horizon rides low on a pill, so the label always sits on bright metal.
      el.style.setProperty("--lc-h", (68 - fy * 9).toFixed(1));
      el.style.setProperty("--lc-ang", ((Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90).toFixed(1) + "deg");
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    let listening = false;
    const io = new IntersectionObserver((entries) => {
      const on = entries[entries.length - 1].isIntersecting;
      if (on && !listening) window.addEventListener("pointermove", onMove, { passive: true });
      if (!on && listening) window.removeEventListener("pointermove", onMove);
      listening = on;
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  const onDown = (e: ReactPointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const id = ++dropId.current;
    setDrops((d) => [...d.slice(-2), { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
  };

  const chrome = variant === "chrome";
  const h = size === "lg" ? 52 : 44;
  const style = {
    ...finishVars(tint),
    "--lc-h": 68,
    height: h,
    padding: size === "lg" ? "0 30px" : "0 22px",
    fontFamily: SANS,
    fontSize: size === "lg" ? 16 : 15,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    color: chrome ? "rgba(12,13,16,0.9)" : INK,
    textShadow: chrome ? "0 1px 0 rgba(255,255,255,0.5)" : "none",
    background: chrome
      ? `radial-gradient(38% 70% at var(--lc-mx) 0%, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%), ${CHROME_BG}`
      : `radial-gradient(60% 120% at var(--lc-mx) 0%, rgba(255,255,255,0.12), rgba(255,255,255,0) 70%), linear-gradient(180deg, ${RAISED}, ${GROUND})`,
    boxShadow: chrome
      ? "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 1px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.08), 0 10px 28px -10px rgba(0,0,0,0.9)"
      : "inset 0 1px 0 rgba(255,255,255,0.1), 0 10px 28px -12px rgba(0,0,0,0.9)",
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  } as CSSProperties;
  const inner = (
    <>
      {/* The bezel: a chrome ring whose light swings toward the pointer. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-[2px] rounded-full"
        style={{
          padding: 2,
          background: "conic-gradient(from var(--lc-ang), var(--lc-3), var(--lc-1) 18%, var(--lc-0) 34%, var(--lc-2) 52%, var(--lc-3) 62%, var(--lc-1) 80%, var(--lc-3))",
          WebkitMask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
          mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
        }}
      />
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        {drops.map((d) => (
          <span
            key={d.id}
            className="lc-drop absolute rounded-full"
            onAnimationEnd={() => setDrops((all) => all.filter((x) => x.id !== d.id))}
            style={{
              left: d.x,
              top: d.y,
              width: h * 3,
              height: h * 3,
              boxShadow: chrome ? "inset 0 0 0 2px rgba(255,255,255,0.9), 0 0 0 1px rgba(0,0,0,0.25)" : "inset 0 0 0 1.5px var(--lc-2)",
              animation: "lc-drop 620ms " + EASE + " forwards",
            }}
          />
        ))}
      </span>
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </>
  );
  const cls =
    "lc-scope lc-pill relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-full" +
    (className ? " " + className : "");
  return (
    <>
      <style>{PILL_CSS + FOCUS_CSS}</style>
      {href && !disabled ? (
        <a ref={(n) => { ref.current = n; }} href={safeHref(href)} onClick={onClick} onPointerDown={onDown} className={cls} style={style}>
          {inner}
        </a>
      ) : (
        <button
          ref={(n) => { ref.current = n; }}
          type={type}
          onClick={onClick}
          onPointerDown={disabled ? undefined : onDown}
          disabled={disabled}
          className={cls}
          style={style}
        >
          {inner}
        </button>
      )}
    </>
  );
}
