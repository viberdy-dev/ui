"use client";

import { useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * OffsetTargetButton — a button whose label plate hangs off its target, along the grid's axis, and seats into it when pressed.
 *
 * The target is the socket, a hairline rectangle where the button is. The
 * label plate hangs off its leading edge by 8px; hover or focus and it
 * reaches further and the bracket lights, press and it seats in 120ms. The
 * socket never moves and the whole label takes the click. Set breaks when
 * the button is the third of a run.
 *
 * Part of the Broken Grid kit: a Klein-blue field #2416f0, paper plates
 * #f1f0e8, ink #0a0a1f, and acid #e2ff3a only where a rule fires. One rule,
 * "The Third": every third module in a run overshoots its leading edge by two
 * gutters (overlapping its neighbour by one) and wears the acid bracket; the
 * ends never break. Radius 0, no shadows; reflows in 380ms, no bounce. Big
 * Shoulders through var(--font-big-shoulders) for display over Geist.
 * Respects prefers-reduced-motion. No dependencies beyond React. Paste it as
 * its own file: it repeats the kit's small helpers, which would clash in one
 * module. Load Big Shoulders with next/font (variable:
 * "--font-big-shoulders") on a parent, or from Google Fonts or @fontsource.
 */

const DISPLAY = 'var(--font-big-shoulders, "Big Shoulders", "Big Shoulders Display", "Arial Narrow", "Roboto Condensed", sans-serif)';

/**
 * A Klein-blue field, paper plates, blue-black ink, and acid for a rule firing.
 * Secondary and tertiary text clear 4.5:1 on their grounds (ink2 7.4, ink3 5.0
 * on paper; onField2 5.9, onField3 4.8 on the field); `edgeOnPaper` is the 3:1
 * boundary for inputs.
 */
const FIELD = {
  field: "#2416f0",
  raised: "#3a2ff5",
  pressed: "#1a0ec4",
  paper: "#f1f0e8",
  ink: "#0a0a1f",
  ink2: "rgba(10,10,31,0.72)",
  ink3: "rgba(10,10,31,0.6)",
  onField2: "rgba(241,240,232,0.86)",
  onField3: "rgba(241,240,232,0.76)",
  lineOnField: "rgba(241,240,232,0.22)",
  lineOnPaper: "rgba(10,10,31,0.14)",
  edgeOnPaper: "rgba(10,10,31,0.5)",
  edgeOnField: "rgba(241,240,232,0.6)",
  acid: "#e2ff3a",
} as const;

/** The mark (bracket, tag, focus ring) for a ground: acid on the field, ink on paper. */
function bgMark(ground: "field" | "paper"): CSSProperties {
  const c = ground === "field" ? FIELD.acid : FIELD.ink;
  return { ["--bg-mark" as string]: c, ["--bg-ring" as string]: c } as CSSProperties;
}

/** Layout changes: 380ms, no stagger, no bounce. Role hand-offs take 240ms. */
const BG_EASE = "cubic-bezier(.2,.8,.2,1)";

const BG_HANDOFF_MS = 240;

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
// revert-layer keeps an element's own corners when a host page's focus rule rounds or flattens them.
const FOCUS_CSS = ".bg-scope :focus-visible,.bg-scope:focus-visible{outline:2px solid var(--bg-ring,#e2ff3a)!important;outline-offset:3px;border-radius:revert-layer}";

/**
 * The bracket a module wears when the rule breaks it: an L of 2px, one gutter
 * long, 6px outside its leading corner, so it reads against the ground. Its
 * colour is --bg-mark (acid on the field, ink on paper; see bgMark).
 */
function BgBracket({ on, size = 24, className = "" }: { on: boolean; size?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <span
      aria-hidden
      className={"pointer-events-none absolute left-0 top-0 block " + className}
      style={{
        width: size,
        height: size,
        borderTop: `2px solid var(--bg-mark, ${FIELD.acid})`,
        borderLeft: `2px solid var(--bg-mark, ${FIELD.acid})`,
        transform: "translate(-6px, -6px)",
        opacity: on ? 1 : 0,
        transition: reduced ? "none" : `opacity ${BG_HANDOFF_MS}ms ${BG_EASE}`,
      }}
    />
  );
}

const BG_BUTTON_INK = {
  paper: { label: FIELD.paper, text: FIELD.ink, socket: "rgba(241,240,232,0.42)", socketOn: "rgba(241,240,232,0.7)", ground: "field" },
  ink: { label: FIELD.ink, text: FIELD.paper, socket: "rgba(10,10,31,0.34)", socketOn: "rgba(10,10,31,0.6)", ground: "paper" },
} as const;

export type BgButtonTone = keyof typeof BG_BUTTON_INK;

/**
 * OffsetTargetButton — a button whose label plate hangs off its target, along
 * the grid's own axis, and seats into it when pressed.
 *
 * The target is the socket, a hairline rectangle exactly where a button
 * should be. The label plate is the same size and hangs off its leading edge
 * by `hang` (8px, a third of a gutter at 1280): the kit's overshoot at the
 * scale of a control, sideways only, never a diagonal drop shadow. Hover or
 * focus it and it hangs further (14px) and the bracket lights; press and it
 * seats into the socket in 120ms, then hangs again on release (200ms). The
 * socket never moves, and the strip the label hangs over is part of the
 * button, so every pixel of the label is clickable. Set `breaks` when the
 * button is the third of a run, and the bracket stays on. Paper for the
 * field, ink for paper; the focus ring follows. A link when given an href.
 */
export function OffsetTargetButton({
  children,
  href,
  onClick,
  type = "button",
  tone = "paper",
  size = "lg",
  hang = 8,
  breaks = false,
  disabled = false,
  ariaLabel,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  onClick?: (e: ReactMouseEvent<HTMLElement>) => void;
  type?: "button" | "submit";
  tone?: BgButtonTone;
  size?: "lg" | "md" | "sm";
  /** How far the label hangs off its target, in px. */
  hang?: number;
  /** The rule fired on this button (the third of a run): keep the bracket on. */
  breaks?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const ink = BG_BUTTON_INK[tone] ?? BG_BUTTON_INK.paper;
  const [state, setState] = useState<"rest" | "hover" | "down">("rest");
  const reduced = useReducedMotion();
  // Resting, the label hangs by `hang`; hovered or focused it reaches further (1.75x); pressed it seats at 0.
  const off = state === "down" ? 0 : state === "hover" ? hang * 1.75 : hang;
  const pad = size === "sm" ? "h-10 px-4 text-[14px]" : size === "md" ? "h-12 px-5 text-[16px]" : "h-14 px-6 text-[18px]";
  const handlers = {
    "aria-label": ariaLabel,
    className: "bg-scope group relative inline-flex select-none no-underline outline-none " + pad + (disabled ? " pointer-events-none opacity-40 " : " ") + className,
    style: { WebkitTapHighlightColor: "transparent", touchAction: "manipulation", borderRadius: 0, ...bgMark(ink.ground) } as CSSProperties,
    onPointerEnter: () => setState("hover"),
    onPointerLeave: () => setState("rest"),
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button === 0) setState("down");
    },
    onPointerUp: () => setState("hover"),
    onPointerCancel: () => setState("rest"),
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => {
      if (!e.repeat && (e.key === "Enter" || (e.key === " " && !href))) setState("down");
    },
    onKeyUp: () => setState("hover"),
    onFocus: () => setState((s) => (s === "rest" ? "hover" : s)),
    onBlur: () => setState("rest"),
  };
  const body = (
    <>
      {/* The socket: the real target, drawn as a hairline. */}
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ boxShadow: `inset 0 0 0 1px ${state === "rest" ? ink.socket : ink.socketOn}` }} />
      {/* The strip the label hangs over belongs to the button, so the whole label takes the click. */}
      <span aria-hidden className="absolute inset-y-0 right-full" style={{ width: hang * 1.75 }} />
      {/* The label plate, hanging off the socket's leading edge. */}
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap"
        style={{
          background: ink.label,
          color: ink.text,
          transform: `translateX(${-off}px)`,
          transition: reduced ? "none" : `transform ${state === "down" ? 120 : 200}ms ${BG_EASE}`,
          fontFamily: DISPLAY,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        <BgBracket on={breaks || state !== "rest"} size={12} />
        {children}
      </span>
      {/* An invisible copy keeps the button as wide as its label. */}
      <span aria-hidden className="invisible flex items-center whitespace-nowrap" style={{ fontFamily: DISPLAY, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {children}
      </span>
    </>
  );
  if (href && !disabled) {
    return (
      <>
        <style>{FOCUS_CSS}</style>
        <a href={safeHref(href)} onClick={onClick} {...handlers}>
          {body}
        </a>
      </>
    );
  }
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <button type={type} onClick={onClick} disabled={disabled} {...handlers}>
        {body}
      </button>
    </>
  );
}
