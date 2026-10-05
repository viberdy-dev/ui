"use client";

import { useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEventHandler, ReactNode } from "react";

/**
 * PushedShadowButton — a neo-brutalist button that behaves like a physical
 * object sitting on its own shadow.
 *
 * The shadow is hard (no blur) and its far corner never moves. Point at the
 * button and it lifts 2px toward you while the shadow grows from 5px to 7px;
 * press it and it lands exactly on the shadow (translate 5px, shadow 0).
 * Every move is 100ms linear: no easing, no overshoot, no scale.
 *
 * The press shows for mouse, touch, pen and keyboard alike (Enter and Space
 * hold it down until the key comes up). The border, the shadow and the arrow's
 * stroke are all the same 3px ink, because a brutalist surface has no blur to
 * hide an inconsistent pixel in.
 *
 * Renders a link when given href, otherwise a button. Type reads
 * var(--font-display) first, so a buyer's own next/font grotesque drops in.
 *
 * Needs Tailwind v4 (or v3.4+). No dependencies beyond React.
 */

const DISPLAY = 'var(--font-display, "Archivo", "Archivo Black", "Arial Black", "Helvetica Neue", Arial, sans-serif)';

/** The kit's flat fills. */
const FILLS = {
  yellow: "#ffd23f",
  coral: "#ff6b6b",
  blue: "#74b9ff",
  lime: "#b4f462",
  pink: "#ff5fa2",
  white: "#ffffff",
  cream: "#fffdf5",
  black: "#000000",
} as const;

export type PushedShadowColor = keyof typeof FILLS;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Relative luminance of #rrggbb, 0 to 1. */
function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Links: strip tabs and newlines, refuse backslashes, allow http(s), mailto, tel and same-site paths. */
function safeHref(raw: string) {
  const v = raw.replace(/[\t\n\r]/g, "").trim();
  if (!v || v.includes("\\")) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#?]/.test(v) && !/^\/\//.test(v)) return v;
  return "#";
}

export type PushedShadowButtonProps = {
  children?: ReactNode;
  /** Renders a link. */
  href?: string;
  /** A kit fill, or any #rrggbb. */
  color?: PushedShadowColor | string;
  /** Border, shadow and (on light fills) label colour, as #rrggbb. Use a light ink on dark pages. */
  ink?: string;
  size?: "sm" | "md" | "lg";
  /** A 3px-stroke arrow after the label that steps 3px right on hover. */
  arrow?: boolean;
  /** Uppercase label. */
  caps?: boolean;
  /** Stretch to the container's width. */
  block?: boolean;
  /** Shows a stepped progress mark, sets aria-busy and ignores clicks. */
  busy?: boolean;
  busyLabel?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
  className?: string;
};

export function PushedShadowButton({
  children = "Start building",
  href,
  color = "yellow",
  ink = "#000000",
  size = "md",
  arrow = false,
  caps = false,
  block = false,
  busy = false,
  busyLabel = "Working",
  type = "button",
  disabled = false,
  onClick,
  className = "",
}: PushedShadowButtonProps) {
  const [pressed, setPressed] = useState(false);
  const named = Object.prototype.hasOwnProperty.call(FILLS, color) ? FILLS[color as PushedShadowColor] : null;
  const fill = named ?? (HEX.test(color) ? color : FILLS.yellow);
  const line = HEX.test(ink) ? ink : "#000000";
  // Dark fills take a cream label; everything else reads in the ink.
  const label = luminance(fill) < 0.3 ? (luminance(line) < 0.3 ? "#fffdf5" : "#000000") : line;
  const inert = disabled || busy;
  const down = pressed && !inert;

  const release = () => setPressed(false);
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.repeat) return;
    if (e.key === "Enter" || (e.key === " " && !href)) setPressed(true);
  };

  const cls =
    "group relative inline-flex select-none items-center justify-center gap-2.5 whitespace-nowrap leading-none " +
    "transition-[transform,translate,box-shadow] duration-100 ease-linear motion-reduce:transition-none " +
    "focus-visible:![outline-offset:4px] focus-visible:![outline-style:dashed] focus-visible:![outline-width:3px] focus-visible:![border-radius:0] " +
    (size === "sm" ? "h-10 px-4 text-[14px] " : size === "lg" ? "h-16 px-8 text-[20px] " : "h-12 px-6 text-[16px] ") +
    (caps ? "uppercase tracking-[0.04em] " : "tracking-[-0.005em] ") +
    (block ? "w-full " : "") +
    (disabled
      ? "cursor-not-allowed shadow-none "
      : busy
        ? "cursor-progress shadow-[5px_5px_0_0_var(--psb-ink)] "
        : down
        ? "translate-x-[5px] translate-y-[5px] shadow-none "
        : "shadow-[5px_5px_0_0_var(--psb-ink)] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[7px_7px_0_0_var(--psb-ink)] ") +
    className;

  const style = {
    "--psb-ink": line,
    fontFamily: DISPLAY,
    fontWeight: 800,
    color: label,
    // Set inline so no global border-colour rule can repaint it.
    border: "3px solid " + line,
    outlineColor: line,
    background: disabled
      ? "repeating-linear-gradient(135deg, " + line + "26 0 3px, transparent 3px 9px), " + fill
      : fill,
    opacity: disabled ? 0.72 : undefined,
  } as CSSProperties;

  const inner = (
    <>
      <span className={busy ? "opacity-0" : undefined}>{children}</span>
      {arrow && !busy && (
        <svg
          aria-hidden
          width={size === "lg" ? 22 : 18}
          height={size === "lg" ? 16 : 14}
          viewBox="0 0 18 14"
          fill="none"
          className="shrink-0 transition-transform duration-100 ease-linear group-hover:translate-x-[3px] motion-reduce:transition-none"
        >
          <path d="M0 7H15M9 1.5L15 7L9 12.5" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" />
        </svg>
      )}
      {busy && (
        <span className="absolute inset-0 flex items-center justify-center gap-[5px]" role="status" aria-label={busyLabel}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden
              className="psb-step size-[9px] motion-reduce:animate-none"
              style={{ background: "currentColor", animationDelay: i * 300 + "ms" }}
            />
          ))}
          <style>{"@keyframes psb-step{0%,32%{opacity:1}33%,100%{opacity:.18}}.psb-step{animation:psb-step 900ms steps(1,end) infinite}"}</style>
        </span>
      )}
    </>
  );

  const handlers = {
    onPointerDown: (e: { button: number }) => {
      if (e.button === 0) setPressed(true);
    },
    onPointerUp: release,
    onPointerLeave: release,
    onPointerCancel: release,
    onKeyDown,
    onKeyUp: release,
    onBlur: release,
  };

  if (href && !disabled) {
    return (
      <a
        href={safeHref(href)}
        onClick={
          busy
            ? (e) => e.preventDefault()
            : onClick
        }
        aria-busy={busy || undefined}
        aria-disabled={busy || undefined}
        className={cls}
        style={style}
        {...handlers}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      type={type}
      disabled={disabled}
      aria-busy={busy || undefined}
      aria-disabled={busy || undefined}
      onClick={busy ? (e) => e.preventDefault() : onClick}
      className={cls}
      style={style}
      {...handlers}
    >
      {inner}
    </button>
  );
}
