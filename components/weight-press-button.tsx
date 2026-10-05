"use client";

import { useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

/**
 * WeightPressButton — a button whose press you can see in its type.
 *
 * Hover and the label thickens a step and the button lifts a pixel as its
 * ambient shadow widens; press and the label goes bold under your finger
 * while the button sinks and the shadow collapses to its contact line, then
 * it springs back past rest. The width never changes (the label is laid
 * out at its boldest). Solid, light and outline. CSS only.
 *
 * Part of the Modern Minimal kit: a paper-white room (#f5f5f2, surfaces
 * #ffffff, ink #141412) and one light, dawn #ffa64d, only ever as light.
 * Two-layer shadows from one light above; scroll binds values directly,
 * with no easing. Inter Tight through var(--font-inter-tight) for display
 * over Geist. Respects prefers-reduced-motion. No dependencies beyond React.
 * Paste it as its own file: it repeats the kit's small helpers, which would
 * clash in one module. Load Inter Tight with next/font (variable:
 * "--font-inter-tight") on a parent, or from Google Fonts or @fontsource.
 */

const DISPLAY = 'var(--font-inter-tight, "Inter Tight", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** A paper-white room and one light. */
const PAPER = {
  ground: "#f5f5f2",
  surface: "#ffffff",
  well: "#ecebe6",
  solid: "#141412",
  ink: "rgba(20,20,18,0.92)",
  ink2: "rgba(20,20,18,0.6)",
  ink3: "rgba(20,20,18,0.38)",
  line: "rgba(20,20,18,0.08)",
  line2: "rgba(20,20,18,0.14)",
  dawn: "#ffa64d",
  night: "#0e0f11",
} as const;

/** Light from above: a 1px contact shadow and a soft ambient one, both falling the same way. */
const SHADOW = "0 1px 2px rgba(20,20,18,0.06), 0 24px 48px -12px rgba(20,20,18,0.1)";

/** Links: strip tabs and newlines, refuse backslashes, allow http(s), mailto, tel and same-site paths. */
function safeHref(raw: string): string {
  const v = raw.replace(/[\t\n\r]/g, "").trim();
  if (!v || v.includes("\\")) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#?]/.test(v) && !/^\/\//.test(v)) return v;
  return "#";
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

// Each part carries only the CSS it needs, so any one of them works on its own.
// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".mm-scope :focus-visible,.mm-scope:focus-visible{outline:2px solid var(--mm-ring,#141412)!important;outline-offset:3px;border-radius:revert-layer}";

const MM_BUTTON_INK = {
  solid: { bg: PAPER.solid, fg: "#f5f5f2", border: "transparent", shadow: true },
  light: { bg: PAPER.surface, fg: PAPER.solid, border: "rgba(20,20,18,0.08)", shadow: true },
  outline: { bg: "transparent", fg: PAPER.solid, border: "rgba(20,20,18,0.22)", shadow: false },
} as const;

export type MmButtonVariant = keyof typeof MM_BUTTON_INK;

/**
 * WeightPressButton — a button whose press you can see in its type.
 *
 * A pill in Inter Tight. Hover and the label thickens a step and the button
 * lifts a pixel as its ambient shadow widens; press and the label goes bold
 * under your finger while the button sinks, the ambient shadow collapsing to
 * the contact one, then springs back past rest on release. Both shadows fall
 * from one light above. Solid, light and outline; a link when given an href.
 * CSS transitions on a variable weight, no animation library.
 */
export function WeightPressButton({
  children,
  href,
  onClick,
  type = "button",
  variant = "solid",
  size = "lg",
  disabled = false,
  ariaLabel,
  ariaPressed,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: MmButtonVariant;
  size?: "lg" | "md" | "sm";
  disabled?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
  className?: string;
}) {
  const ink = MM_BUTTON_INK[variant] ?? MM_BUTTON_INK.solid;
  const [state, setState] = useState<"rest" | "hover" | "down">("rest");
  const reduced = useReducedMotion();
  const weight = state === "down" ? 680 : state === "hover" ? 560 : 500;
  const shadow = !ink.shadow
    ? "none"
    : state === "down"
      ? "0 1px 1px rgba(20,20,18,0.1), 0 6px 12px -8px rgba(20,20,18,0.14)"
      : state === "hover"
        ? "0 1px 2px rgba(20,20,18,0.06), 0 30px 56px -14px rgba(20,20,18,0.16)"
        : SHADOW;
  const pad = size === "sm" ? "h-9 px-4 text-[13px]" : size === "md" ? "h-11 px-5 text-[14px]" : "h-[52px] px-7 text-[15px]";
  const common = {
    "aria-label": ariaLabel,
    className: "mm-scope relative inline-flex select-none items-center justify-center rounded-full no-underline outline-none " + pad + (disabled ? " pointer-events-none opacity-40 " : " ") + className,
    style: {
      background: ink.bg,
      color: ink.fg,
      border: `1px solid ${ink.border}`,
      boxShadow: shadow,
      fontFamily: DISPLAY,
      fontWeight: weight,
      letterSpacing: "-0.01em",
      transform: state === "down" ? "translateY(1px) scale(0.985)" : state === "hover" ? "translateY(-1px)" : "none",
      transition: reduced
        ? "none"
        : state === "rest"
          ? `transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 260ms ${EASE}, font-weight 220ms ${EASE}`
          : `transform 160ms ${EASE}, box-shadow 160ms ${EASE}, font-weight 160ms ${EASE}`,
    } as CSSProperties,
    onPointerEnter: () => setState("hover"),
    onPointerLeave: () => setState("rest"),
    onPointerDown: () => setState("down"),
    onPointerUp: () => setState("hover"),
    onPointerCancel: () => setState("rest"),
    onFocus: () => setState((s) => (s === "rest" ? "hover" : s)),
    onBlur: () => setState("rest"),
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key === "Enter" || (e.key === " " && !href)) setState("down");
    },
    onKeyUp: () => setState("hover"),
  };
  // The label is laid out at the boldest weight too, invisibly, so the button never changes width.
  const label = (
    <span className="relative inline-grid">
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap" style={{ fontWeight: 680 }}>
        {children}
      </span>
      <span className="col-start-1 row-start-1 whitespace-nowrap text-center">{children}</span>
    </span>
  );
  if (href) {
    return (
      <>
        <style>{FOCUS_CSS}</style>
        <a href={safeHref(href)} onClick={onClick} {...common}>
          {label}
        </a>
      </>
    );
  }
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <button type={type} onClick={onClick} disabled={disabled} aria-pressed={ariaPressed} {...common}>
        {label}
      </button>
    </>
  );
}
