"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

/**
 * HairlineMorphNav — a nav whose one hairline stretches toward the next link and settles.
 *
 * Choose another link and the line's leading edge runs ahead on a quick
 * spring while its trailing edge follows on a slower one, so it stretches
 * across the gap and gathers under its new link; the active label steps up
 * a weight without shifting anything. Hover previews the target with a faint
 * line. Controlled or not; folds into a menu on narrow containers.
 *
 * Part of the Modern Minimal kit: a paper-white room (#f5f5f2, surfaces
 * #ffffff, ink #141412) and one light, dawn #ffa64d, only ever as light.
 * Two-layer shadows from one light above; scroll binds values directly,
 * with no easing. Inter Tight through var(--font-inter-tight) for display
 * over Geist. Respects prefers-reduced-motion. No dependencies beyond React.
 * Paste it as its own file: it repeats the kit's small helpers, which would
 * clash in one module. Load Inter Tight with next/font (variable:
 * "--font-inter-tight") on a parent, or from Google Fonts or @fontsource.
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries plugin).
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

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

/** A spring for one number; returns the new value and velocity. */
function spring(x: number, v: number, target: number, dt: number, k = 260, c = 26): [number, number] {
  const steps = dt > 1 / 60 ? 2 : 1;
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    v += (k * (target - x) - c * v) * h;
    x += v * h;
  }
  return [x, v];
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

export type MmLink = { label: string; href: string };

/**
 * HairlineMorphNav — a nav whose one hairline stretches toward the next link
 * and settles under it.
 *
 * The active link is marked by a single 1.5px ink line. Choose another and
 * its leading edge runs ahead on a quick spring while its trailing edge
 * follows on a slower one, so the line stretches across the gap and then
 * gathers under its new link; the active label steps up a weight (laid out
 * at the heavier weight too, so nothing shifts). Hover or focus previews the
 * target with a faint line. `tone` turns it over for a night section.
 * Controlled or not; folds into a menu on narrow containers.
 */
export function HairlineMorphNav({
  brand = "Halden",
  links,
  cta,
  active,
  defaultActive,
  onNavigate,
  tone = "light",
  className = "",
  style,
}: {
  brand?: string;
  links: MmLink[];
  cta?: MmLink | null;
  /** The active link's href, controlled. */
  active?: string;
  defaultActive?: string;
  onNavigate?: (href: string) => void;
  /** "dark" over a night section: the bar, the type and the line turn over. */
  tone?: "light" | "dark";
  className?: string;
  style?: CSSProperties;
}) {
  const [own, setOwn] = useState(defaultActive ?? links[0]?.href ?? "");
  const current = active ?? own;
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(-1);
  const menuId = useId();
  const reduced = useReducedMotion();
  const rowRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const edges = useRef({ l: -1, r: -1, vl: 0, vr: 0, raf: 0, last: 0 });
  const idx = Math.max(0, links.findIndex((l) => l.href === current));
  const dark = tone === "dark";
  const fg = dark ? "#f5f5f2" : PAPER.solid;
  const fg2 = dark ? "rgba(245,245,242,0.62)" : PAPER.ink2;
  const turn = `background 300ms ${EASE}, color 300ms ${EASE}, border-color 300ms ${EASE}`;

  // The line's two edges: the one moving forward is quick (stiffness 420), the one behind is slower (170).
  useEffect(() => {
    const row = rowRef.current;
    const line = lineRef.current;
    const ghost = ghostRef.current;
    if (!row || !line || !ghost) return;
    const e = edges.current;
    const at = (i: number) => {
      const a = linkRefs.current[i];
      if (!a) return null;
      const r0 = row.getBoundingClientRect();
      const r = a.getBoundingClientRect();
      const k = row.offsetWidth ? r0.width / row.offsetWidth : 1;
      return { l: (r.left - r0.left) / k + 14, r: (r.right - r0.left) / k - 14 };
    };
    const tick = (now: number) => {
      e.raf = 0;
      const dt = e.last ? Math.min(0.05, (now - e.last) / 1000) : 1 / 60;
      e.last = now;
      const t = at(idx);
      if (!t) return;
      if (e.l < 0 || reduced) {
        e.l = t.l;
        e.r = t.r;
      } else {
        const right = t.r > e.r;
        [e.l, e.vl] = spring(e.l, e.vl, t.l, dt, right ? 170 : 420, right ? 25 : 34);
        [e.r, e.vr] = spring(e.r, e.vr, t.r, dt, right ? 420 : 170, right ? 34 : 25);
      }
      line.style.transform = `translateX(${e.l}px) scaleX(${Math.max(1, e.r - e.l)})`;
      const h = hover >= 0 && hover !== idx ? at(hover) : null;
      ghost.style.opacity = h ? "1" : "0";
      if (h) ghost.style.transform = `translateX(${h.l}px) scaleX(${Math.max(1, h.r - h.l)})`;
      const moving = Math.abs(t.l - e.l) + Math.abs(t.r - e.r) > 0.3 || Math.abs(e.vl) + Math.abs(e.vr) > 1;
      if (moving) e.raf = requestAnimationFrame(tick);
      else e.last = 0;
    };
    const ro = new ResizeObserver(() => {
      if (!e.raf) e.raf = requestAnimationFrame(tick);
    });
    ro.observe(row);
    if (!e.raf) e.raf = requestAnimationFrame(tick);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(e.raf);
      e.raf = 0;
    };
  }, [idx, hover, reduced, links.length]);

  // The menu closes on Escape (focus back to its button) and on a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    const onDown = (ev: PointerEvent) => {
      const t = ev.target as Node;
      if (!panelRef.current?.contains(t) && !menuBtn.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const go = (href: string) => {
    if (active === undefined) setOwn(href);
    onNavigate?.(href);
    setOpen(false);
  };

  return (
    <header className={"mm-scope relative w-full @container " + className} style={{ fontFamily: SANS, color: PAPER.ink, ["--mm-ring" as string]: dark ? "#f5f5f2" : "#141412", ...style } as CSSProperties}>
      <style>{FOCUS_CSS}</style>
      <nav
        aria-label="Main"
        className="flex h-16 items-center gap-6 px-5 @3xl:px-8"
        style={{ background: dark ? "rgba(14,15,17,0.55)" : "rgba(245,245,242,0.78)", backdropFilter: "saturate(1.4) blur(16px)", WebkitBackdropFilter: "saturate(1.4) blur(16px)", borderBottom: `1px solid ${dark ? "rgba(245,245,242,0.08)" : PAPER.line}`, transition: turn }}
      >
        <a href={safeHref(links[0]?.href ?? "#")} onClick={() => go(links[0]?.href ?? "#")} className="flex shrink-0 items-center gap-2.5 no-underline" style={{ color: fg, transition: turn }}>
          <span aria-hidden className="h-[14px] w-[14px] rounded-full" style={{ background: `radial-gradient(circle at 50% 40%, #fff7ea, ${PAPER.dawn})`, boxShadow: "0 0 10px 1px rgba(255,166,77,0.45)" }} />
          <span className="text-[17px] font-semibold" style={{ fontFamily: DISPLAY, letterSpacing: "-0.02em" }}>
            {brand}
          </span>
        </a>
        <div ref={rowRef} className="relative mx-auto hidden h-full min-w-0 flex-1 @3xl:block">
          <ul className="m-0 flex h-full list-none items-center justify-center gap-1 p-0">
            {links.map((l, i) => {
              const on = l.href === current;
              return (
                <li key={l.href}>
                  <a
                    ref={(el) => void (linkRefs.current[i] = el)}
                    href={safeHref(l.href)}
                    aria-current={on ? "page" : undefined}
                    onClick={() => go(l.href)}
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(-1)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(-1)}
                    className="relative inline-grid px-3.5 py-2 text-[14px] no-underline"
                    style={{ color: on ? fg : fg2, transition: `color 200ms ${EASE}` }}
                  >
                    <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap" style={{ fontWeight: 600 }}>
                      {l.label}
                    </span>
                    <span className="col-start-1 row-start-1 whitespace-nowrap text-center" style={{ fontWeight: on ? 600 : 450, transition: `font-weight 220ms ${EASE}` }}>
                      {l.label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <span ref={ghostRef} aria-hidden className="pointer-events-none absolute bottom-[14px] left-0 block h-px w-px origin-left" style={{ background: dark ? "rgba(245,245,242,0.38)" : PAPER.ink3, opacity: 0, transition: `opacity 200ms ${EASE}` }} />
          <span ref={lineRef} aria-hidden className="pointer-events-none absolute bottom-[13px] left-0 block h-[1.5px] w-px origin-left" style={{ background: fg, transition: turn }} />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 @3xl:ml-0">
          {cta ? (
            <WeightPressButton href={cta.href} size="sm" variant={dark ? "light" : "solid"} onClick={() => go(cta.href)}>
              {cta.label}
            </WeightPressButton>
          ) : null}
          <button
            ref={menuBtn}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full @3xl:hidden"
            style={{ border: `1px solid ${PAPER.line2}`, background: PAPER.surface, color: PAPER.solid }}
          >
            <span className="sr-only">Menu</span>
            <span aria-hidden className="flex flex-col gap-[4px]">
              <span className="block h-px w-3.5" style={{ background: "currentColor", transform: open ? "translateY(2.5px) rotate(45deg)" : "none", transition: `transform 220ms ${EASE}` }} />
              <span className="block h-px w-3.5" style={{ background: "currentColor", transform: open ? "translateY(-2.5px) rotate(-45deg)" : "none", transition: `transform 220ms ${EASE}` }} />
            </span>
          </button>
        </div>
      </nav>
      {open ? (
        <div ref={panelRef} id={menuId} className="absolute inset-x-3 top-[70px] z-20 rounded-[20px] p-2 @3xl:hidden" style={{ background: PAPER.surface, border: `1px solid ${PAPER.line}`, boxShadow: SHADOW }}>
          <ul className="m-0 list-none p-0">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={safeHref(l.href)}
                  aria-current={l.href === current ? "page" : undefined}
                  onClick={() => go(l.href)}
                  className="flex items-center justify-between rounded-[12px] px-3 py-2.5 text-[15px] no-underline"
                  style={{ color: l.href === current ? PAPER.solid : PAPER.ink2, fontWeight: l.href === current ? 600 : 450 }}
                >
                  {l.label}
                  {l.href === current ? <span aria-hidden className="h-px w-5" style={{ background: PAPER.solid }} /> : null}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
