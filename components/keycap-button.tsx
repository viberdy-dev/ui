"use client";

import { useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * KeycapButton — a button machined like a keycap.
 *
 * Its skirt is a stack of hard shadows: a press (pointer, Enter or Space)
 * drops the cap 6px and collapses the skirt in 90ms, release springs it back
 * past rest in 320ms. A specular follows the pointer, the cap lifts 1px on
 * hover, and a copper status light glows while it is held. Three finishes;
 * a ghost variant for the second action. CSS only.
 *
 * Part of the Spatial 3D kit: a dark studio (#0a0a0d, panels #101114 and
 * #16171b, ink #f2f1ee) with anodised copper #ff7a3d only as light, and
 * one object in three finishes (titanium, ceramic, soft-touch polymer) under
 * one rig: key, fill and rim, soft shadows, occlusion and a softbox
 * reflection. Hanken Grotesk through var(--font-hanken) for display over
 * Geist. Respects prefers-reduced-motion. No dependencies beyond React.
 * Paste it as its own file: it repeats the kit's small helpers, which would
 * clash in one module. Load Hanken Grotesk with next/font (variable:
 * "--font-hanken") on a parent, or from Google Fonts or @fontsource.
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

/**
 * The three finishes the object can wear. `base` is the colour; the rest are
 * shader parameters: gloss (0-1), specular strength, rim, subsurface wrap, and
 * how metallic it is. `css` holds the colours the CSS-3D parts draw with.
 */
export const S3_FINISHES = {
  titanium: {
    label: "Titanium",
    base: [0.725, 0.737, 0.761],
    gloss: 0.62,
    spec: 0.8,
    rim: 0.3,
    sss: 0,
    metal: 1,
    css: { face: "#c9ccd2", side: "#8d9098", edge: "#e6e8ec", shade: "#5d6068" },
  },
  ceramic: {
    label: "Ceramic",
    base: [0.925, 0.906, 0.867],
    gloss: 0.4,
    spec: 0.25,
    rim: 0.18,
    sss: 0.08,
    metal: 0,
    css: { face: "#ece7dd", side: "#c9c2b5", edge: "#faf7f1", shade: "#9a9386" },
  },
  polymer: {
    label: "Polymer",
    base: [0.106, 0.11, 0.125],
    gloss: 0.3,
    spec: 0.12,
    rim: 0.22,
    sss: 0,
    metal: 0,
    css: { face: "#26272c", side: "#18191d", edge: "#3a3b41", shade: "#0e0f12" },
  },
} as const;

export type S3Finish = keyof typeof S3_FINISHES;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

function finishOf(name: string) {
  return own(S3_FINISHES, name) ? S3_FINISHES[name] : S3_FINISHES.titanium;
}

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
const FOCUS_CSS = ".s3-scope :focus-visible,.s3-scope:focus-visible{outline:2px solid var(--s3-ring,#ff7a3d);outline-offset:3px;border-radius:revert-layer}";

// The cap's travel and its spring: down in 90ms, back with a slight overshoot in 320ms.
const KEYCAP_CSS =
  ".s3-key{--s3-depth:7px;transform:translateY(0);box-shadow:0 1px 0 var(--s3-side),0 2px 0 var(--s3-side),0 3px 0 var(--s3-side),0 4px 0 var(--s3-side),0 5px 0 var(--s3-side),0 6px 0 var(--s3-side),0 7px 0 var(--s3-shade),0 16px 26px -10px rgba(0,0,0,.65);transition:transform 320ms cubic-bezier(.34,1.56,.64,1),box-shadow 320ms cubic-bezier(.34,1.56,.64,1)}" +
  ".s3-key:hover{transform:translateY(-1px);box-shadow:0 1px 0 var(--s3-side),0 2px 0 var(--s3-side),0 3px 0 var(--s3-side),0 4px 0 var(--s3-side),0 5px 0 var(--s3-side),0 6px 0 var(--s3-side),0 7px 0 var(--s3-side),0 8px 0 var(--s3-shade),0 20px 30px -10px rgba(0,0,0,.7)}" +
  ".s3-key[data-down]{transform:translateY(6px);box-shadow:0 1px 0 var(--s3-shade),0 6px 12px -8px rgba(0,0,0,.6);transition-duration:90ms;transition-timing-function:ease-out}" +
  ".s3-key .s3-spec{background:radial-gradient(120px 70px at var(--s3-mx,30%) var(--s3-my,0%),rgba(255,255,255,.34),transparent 70%);opacity:.8;transition:opacity 220ms}" +
  ".s3-key:hover .s3-spec{opacity:1}" +
  ".s3-key .s3-led{background:var(--s3-led-off);box-shadow:none;transition:background-color 180ms,box-shadow 180ms}" +
  ".s3-key[data-down] .s3-led,.s3-key[data-lit] .s3-led{background:#ff7a3d;box-shadow:0 0 6px 1px rgba(255,122,61,.9),0 0 16px 2px rgba(255,122,61,.45)}" +
  "@media (prefers-reduced-motion: reduce){.s3-key,.s3-key[data-down]{transition:none}}";

export type KeycapButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  /** "key": a raised keycap in a finish; "ghost": a hairline key for the second action. */
  variant?: "key" | "ghost";
  finish?: S3Finish;
  size?: "lg" | "md";
  /** Keep the status light on (a chosen option). */
  lit?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
  className?: string;
};

/**
 * A button machined like a keycap. Its skirt is a stack of hard shadows, so
 * pressing it (pointer, Enter or Space) drops the cap 6px and the skirt
 * collapses in 90ms; letting go springs it back past rest in 320ms. A soft
 * specular sits where the pointer is, the cap lifts 1px on hover, and a
 * copper status light in the corner glows while it is held (or stays lit
 * with `lit`). Finishes: titanium, ceramic, polymer. Renders a link when
 * given an href, else a button.
 */
export function KeycapButton({ children, href, onClick, type = "button", variant = "key", finish = "titanium", size = "lg", lit, disabled, ariaLabel, ariaPressed, className }: KeycapButtonProps) {
  const [down, setDown] = useState(false);
  const f = finishOf(finish).css;
  const ghost = variant === "ghost";
  const dark = finish === "polymer" || ghost;
  const style = {
    "--s3-side": ghost ? "rgba(242,241,238,0.14)" : f.side,
    "--s3-shade": ghost ? "rgba(242,241,238,0.06)" : f.shade,
    "--s3-led-off": dark ? "rgba(242,241,238,0.18)" : "rgba(10,10,13,0.18)",
    "--s3-ring": "#ff7a3d",
    background: ghost ? "rgba(22,23,27,0.9)" : `linear-gradient(180deg, ${f.edge}, ${f.face} 38%, ${f.face} 70%, ${f.side})`,
    color: dark ? "rgba(242,241,238,0.92)" : "#16171b",
    border: ghost ? "1px solid rgba(242,241,238,0.16)" : `1px solid ${f.edge}`,
    touchAction: "manipulation",
  } as CSSProperties;
  const cls =
    "s3-scope s3-key relative inline-flex select-none items-center justify-center gap-3 overflow-hidden rounded-[14px] font-semibold outline-none " +
    (size === "lg" ? "h-[52px] px-6 text-[15px] " : "h-11 px-5 text-[14px] ") +
    (disabled ? "pointer-events-none opacity-45 " : "cursor-pointer ") +
    (className ?? "");
  const press = (on: boolean) => {
    if (!disabled) setDown(on);
  };
  const handlers = {
    onPointerDown: () => press(true),
    onPointerUp: () => press(false),
    onPointerLeave: () => press(false),
    onPointerCancel: () => press(false),
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty("--s3-mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      e.currentTarget.style.setProperty("--s3-my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    },
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (!e.repeat && (e.key === "Enter" || e.key === " ")) press(true);
    },
    onKeyUp: () => press(false),
    onBlur: () => press(false),
  };
  const inner = (
    <>
      <span aria-hidden className="s3-spec pointer-events-none absolute inset-0" />
      <span aria-hidden className="s3-led absolute left-2.5 top-2.5 size-[5px] rounded-full" />
      <span className="relative" style={{ fontFamily: SANS, letterSpacing: "-0.005em" }}>
        {children}
      </span>
    </>
  );
  const data = { "data-down": down ? "" : undefined, "data-lit": lit ? "" : undefined };
  if (href) {
    return (
      <>
        <style>{FOCUS_CSS + KEYCAP_CSS}</style>
        <a href={safeHref(href)} onClick={onClick} aria-label={ariaLabel} className={cls} style={style} {...data} {...handlers}>
          {inner}
        </a>
      </>
    );
  }
  return (
    <>
      <style>{FOCUS_CSS + KEYCAP_CSS}</style>
      <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel} aria-pressed={ariaPressed} className={cls} style={style} {...data} {...handlers}>
        {inner}
      </button>
    </>
  );
}
