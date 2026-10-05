"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

/**
 * AuroraFlowNav — a nav whose active mark is a band of aurora light.
 *
 * A thin lit line with short rays rising from it, cut from one gradient
 * that spans the nav and drifts on a 60s clock, so the band takes the colour
 * of the sky above the link it sits under. Choose a link and the band
 * flows there, leading edge first (240ms), trailing edge after (420ms);
 * hover or focus lays a faint ghost of it. Controlled (a scroll spy) or
 * not; the links fold into a menu on narrow containers.
 *
 * Part of the Aurora kit: a near-black night (#050608) lit by curtains of
 * aurora in mint #7cf5c4 and sky #38bdf8, a violet #a78bfa blend, a rose
 * #f472b6 crown and an indigo #5b6cc4 fringe, all on one 60s clock; Bricolage
 * Grotesque through var(--font-bricolage) for lit display type over Geist.
 * Respects prefers-reduced-motion. No dependencies beyond React. Paste it as
 * its own file: it repeats the kit's small helpers, which would clash in one
 * module. For the display face, load Bricolage Grotesque with next/font
 * (variable: "--font-bricolage") on a parent; elsewhere, load it with a
 * Google Fonts link or @fontsource and set --font-bricolage yourself.
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries plugin).
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const DISPLAY = 'var(--font-bricolage, "Bricolage Grotesque", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The night the kit is set in. */
const SKY = {
  ground: "#050608",
  panel: "#0a0d12",
  raised: "#0f141a",
  ink: "rgba(236,244,248,0.94)",
  ink2: "rgba(236,244,248,0.64)",
  ink3: "rgba(236,244,248,0.42)",
  line: "rgba(236,244,248,0.08)",
  line2: "rgba(236,244,248,0.16)",
  shadow: "0 40px 100px -30px rgba(0,0,0,0.7)",
} as const;

/**
 * The sky's colours by altitude: the core low in the curtain (two hues it
 * drifts between on the aurora clock), a violet blend above it, a rose crown
 * seen only in a strong display, and an indigo fringe under the lower border.
 */
export type AuPalette = { core: string; core2: string; blend: string; high: string; fringe: string };

export const AU_PALETTES = {
  boreal: { core: "#7cf5c4", core2: "#38bdf8", blend: "#a78bfa", high: "#f472b6", fringe: "#5b6cc4" },
  verdant: { core: "#6ee7a0", core2: "#7cf5c4", blend: "#8fb4f0", high: "#e879b9", fringe: "#5b6cc4" },
  violet: { core: "#a78bfa", core2: "#38bdf8", blend: "#c4a6fb", high: "#f472b6", fringe: "#4c5bb8" },
} as const satisfies Record<string, AuPalette>;

export type AuPaletteName = keyof typeof AU_PALETTES;

function own<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** A named palette, or boreal. */
function paletteOf(name: string): AuPalette {
  return own(AU_PALETTES, name) ? AU_PALETTES[name] : AU_PALETTES.boreal;
}

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt((HEX.test(hex) ? hex : "#7cf5c4").slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * The aurora clock: every lit part of the page reads one 60s cycle, so a
 * button, a rim and the sky drift together instead of breathing out of step.
 * The phase is the page's own timeline (performance.now), shared by
 * everything on it.
 */
const CLOCK_S = 60;

/**
 * A ref callback that starts an element's CSS animation where the clock
 * already is, so parts that mount at different moments stay in step.
 */
function syncClock(periodS: number) {
  return (el: HTMLElement | null) => {
    if (el) el.style.animationDelay = `${(-(performance.now() / 1000) % periodS).toFixed(3)}s`;
  };
}

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
// Nothing is interpolated into these sheets; colours arrive as CSS variables.
// revert-layer keeps an element's own rounded corners when a host page's focus rule flattens them.
const FOCUS_CSS = ".au-scope :focus-visible,.au-scope:focus-visible{outline:2px solid var(--au-ring,#7cf5c4);outline-offset:3px;border-radius:revert-layer}";

/** The palette as CSS variables, for the parts drawn in CSS. */
function paletteVars(p: AuPalette): CSSProperties {
  return { "--au-core": p.core, "--au-core2": p.core2, "--au-blend": p.blend, "--au-high": p.high, "--au-ring": p.core } as CSSProperties;
}

// A registered angle, so the under-glow turns on the compositor without a render per frame.
const GLOW_BTN_CSS =
  "@property --au-a{syntax:'<angle>';inherits:false;initial-value:0deg}" +
  "@keyframes au-turn{to{--au-a:360deg}}" +
  "@keyframes au-ring{from{opacity:.9;transform:scale(1)}to{opacity:0;transform:scale(1.18,1.5)}}" +
  ".au-glow{inset:-6px -8px -12px;opacity:.55;animation:au-turn 60s linear infinite}" +
  ".au-btn:hover .au-glow,.au-btn:focus-visible .au-glow{inset:-12px -14px -18px;opacity:.85}" +
  ".au-q .au-glow{opacity:0}.au-q:hover .au-glow,.au-q:focus-visible .au-glow{opacity:.4}" +
  ".au-btn:active{transform:translateY(1px) scale(.985)}" +
  "@media (prefers-reduced-motion: reduce){.au-glow{animation:none}.au-ring{animation:none!important;opacity:0}}";

export type AuroraGlowButtonProps = {
  children: ReactNode;
  /** Renders a link when given, else a button. */
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  /** "solid" carries the sky under it; "quiet" is a hairline pill whose light wakes on hover. */
  variant?: "solid" | "quiet";
  size?: "md" | "lg";
  palette?: AuPaletteName;
  disabled?: boolean;
  className?: string;
};

/**
 * A pill with a sliver of the sky under it. The under-glow is a slow turn
 * through the palette on the page's 60s aurora clock, so every button on the
 * page glows in step with the sky; hover or focus lets it spread (220ms), and
 * a press (or Enter or Space) sends a ring of light out from the pill (380ms). The top edge
 * carries a thin lit rim. Renders a link when given an href, else a button.
 */
export function AuroraGlowButton({ children, href, onClick, type = "button", variant = "solid", size = "md", palette = "boreal", disabled, className }: AuroraGlowButtonProps) {
  const p = paletteOf(palette);
  const [ring, setRing] = useState(0);
  const solid = variant === "solid";
  const cls =
    "au-scope au-btn relative isolate inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[transform,color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50 " +
    (size === "lg" ? "h-[52px] px-7 text-[15px]" : "h-11 px-5 text-[14px]") +
    (solid ? "" : " au-q") +
    (className ? " " + className : "");
  const style: CSSProperties = {
    ...paletteVars(p),
    color: SKY.ink,
    fontFamily: SANS,
    background: solid ? `linear-gradient(180deg, ${SKY.raised}, ${SKY.panel})` : "transparent",
    boxShadow: solid ? `inset 0 0 0 1px ${SKY.line2}, 0 10px 30px -12px rgba(0,0,0,0.8)` : `inset 0 0 0 1px ${SKY.line2}`,
  };
  const sheet = <style>{FOCUS_CSS + GLOW_BTN_CSS}</style>;
  const inner = (
    <>
      {/* The sky under the pill, turning on the aurora clock. */}
      <span
        ref={syncClock(CLOCK_S)}
        aria-hidden
        className="au-glow pointer-events-none absolute -z-10 rounded-full transition-[inset,opacity] duration-200"
        style={{
          background: "conic-gradient(from var(--au-a), var(--au-core), var(--au-core2), var(--au-blend), var(--au-core2), var(--au-core))",
          filter: "blur(14px)",
        }}
      />
      {/* A lit rim along the top edge. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          padding: 1,
          background: `linear-gradient(90deg, transparent 12%, ${rgba(p.core, solid ? 0.7 : 0.35)} 40%, ${rgba(p.core2, solid ? 0.6 : 0.3)} 62%, transparent 88%) top / 100% 1px no-repeat`,
        }}
      />
      {ring > 0 && (
        <span
          key={ring}
          aria-hidden
          className="au-ring pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 0 1px ${rgba(p.core, 0.8)}, 0 0 24px ${rgba(p.core2, 0.5)}`, animation: `au-ring 380ms ${EASE} both` }}
        />
      )}
      <span className="relative">{children}</span>
    </>
  );
  const onDown = () => {
    if (!disabled) setRing((r) => r + 1);
  };
  const onKey = (e: ReactKeyboardEvent) => {
    if (!e.repeat && (e.key === "Enter" || e.key === " ")) onDown();
  };
  if (href !== undefined) {
    return (
      <>
        {sheet}
        <a href={safeHref(href)} onClick={onClick} onPointerDown={onDown} onKeyDown={onKey} className={cls} style={style}>
          {inner}
        </a>
      </>
    );
  }
  return (
    <>
      {sheet}
      <button type={type} onClick={onClick} onPointerDown={onDown} onKeyDown={onKey} disabled={disabled} className={cls} style={style}>
        {inner}
      </button>
    </>
  );
}

export type AuLink = { label: string; href: string };

// Registered lengths, so the band's two edges can travel at different speeds.
const NAV_CSS =
  "@property --au-l{syntax:'<length>';inherits:false;initial-value:0px}" +
  "@property --au-r{syntax:'<length>';inherits:false;initial-value:0px}" +
  "@keyframes au-slide{to{background-position:-200% 0}}" +
  ".au-band{transition-property:--au-l,--au-r,opacity;transition-timing-function:cubic-bezier(0.22,1,0.36,1)}" +
  ".au-sky{background-size:200% 100%;animation:au-slide 60s linear infinite}" +
  "@keyframes au-drop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}" +
  "@media (prefers-reduced-motion: reduce){.au-band{transition:none!important}.au-sky{animation:none}.au-drop{animation:none!important}}";

/** Lays a band under a link: its two edges travel at different speeds, the leading one first. */
function layBand(el: HTMLSpanElement | null, a: HTMLElement | undefined, flow: boolean) {
  if (!el) return;
  if (!a) {
    el.style.opacity = "0";
    return;
  }
  const l = a.offsetLeft + 12;
  const r = a.offsetLeft + a.offsetWidth - 12;
  const prevL = parseFloat(el.style.getPropertyValue("--au-l")) || l;
  const right = l >= prevL;
  el.style.transitionDuration = flow ? (right ? "420ms, 240ms, 200ms" : "240ms, 420ms, 200ms") : "0ms, 0ms, 200ms";
  el.style.setProperty("--au-l", `${l}px`);
  el.style.setProperty("--au-r", `${r}px`);
  el.style.opacity = "1";
}

export type AuroraFlowNavProps = {
  brand: string;
  links: AuLink[];
  cta?: AuLink;
  /** "solid" by default; "quiet" when the page already has a filled action in view. */
  ctaVariant?: "solid" | "quiet";
  /** The active link's href, when the page controls it (a scroll spy). */
  active?: string;
  /** The link active at first, when the nav controls it. */
  defaultActive?: string;
  onNavigate?: (href: string) => void;
  palette?: AuPaletteName;
  className?: string;
};

/**
 * A floating night-glass nav whose active mark is a band of aurora light: a
 * thin lit line with short rays rising from it, cut from one gradient that
 * spans the whole nav and drifts on the 60s aurora clock, so the band shows
 * the colour of the sky above whichever link it sits under. Choose a link and
 * the band flows to it, its leading edge first (240ms) and its trailing edge
 * after (420ms); hovering or focusing a link lays a faint ghost of the band
 * under it. Below the container's small breakpoint the links fold into a
 * menu. The call to action is the kit's AuroraGlowButton.
 */
export function AuroraFlowNav({ brand, links, cta, ctaVariant = "solid", active, defaultActive, onNavigate, palette = "boreal", className }: AuroraFlowNavProps) {
  const p = paletteOf(palette);
  const [chosen, setChosen] = useState(defaultActive ?? links[0]?.href ?? "");
  const [open, setOpen] = useState(false);
  const current = active ?? chosen;
  const listRef = useRef<HTMLUListElement>(null);
  const bandRef = useRef<HTMLSpanElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const items = useRef(new Map<string, HTMLAnchorElement>());
  const rootRef = useRef<HTMLElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduced = useReducedMotion();

  // The band follows the active link, and re-measures when the nav changes size.
  useEffect(() => {
    const list = listRef.current;
    const band = bandRef.current;
    if (!list || !band) return;
    const first = !band.style.getPropertyValue("--au-l");
    const map = items.current;
    layBand(band, map.get(current), !first && !reduced);
    const ro = new ResizeObserver(() => layBand(band, map.get(current), false));
    ro.observe(list);
    return () => ro.disconnect();
  }, [current, links, reduced]);

  // The folded menu closes on Escape and on a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const choose = (href: string) => {
    setChosen(href);
    setOpen(false);
    onNavigate?.(href);
  };
  const skyGradient = `linear-gradient(90deg, ${p.core}, ${p.core2} 25%, ${p.blend} 50%, ${p.core2} 75%, ${p.core})`;
  const bandLayers = (strength: number) => (
    <>
      <span ref={syncClock(CLOCK_S)} className="au-sky absolute inset-x-0 bottom-0 h-[2px] rounded-full" style={{ backgroundImage: skyGradient, opacity: strength }} />
      <span
        ref={syncClock(CLOCK_S)}
        className="au-sky absolute inset-x-0 bottom-[2px] h-[16px]"
        style={{
          backgroundImage: skyGradient,
          opacity: 0.75 * strength,
          filter: "blur(1.5px)",
          WebkitMaskImage: "linear-gradient(to top, #000, transparent), repeating-linear-gradient(90deg, #000 0 2px, rgba(0,0,0,0.3) 2px 5px)",
          maskImage: "linear-gradient(to top, #000, transparent), repeating-linear-gradient(90deg, #000 0 2px, rgba(0,0,0,0.3) 2px 5px)",
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }}
      />
    </>
  );
  return (
    <nav ref={rootRef} aria-label="Main" className={"au-scope @container relative" + (className ? " " + className : "")} style={{ ...paletteVars(p), fontFamily: SANS, color: SKY.ink }}>
      <style>{FOCUS_CSS + NAV_CSS}</style>
      <div
        className="flex h-[60px] items-center gap-2 rounded-full pl-6 pr-2"
        style={{ background: "rgba(10,13,18,0.66)", WebkitBackdropFilter: "blur(16px) saturate(140%)", backdropFilter: "blur(16px) saturate(140%)", boxShadow: `inset 0 0 0 1px ${SKY.line2}, ${SKY.shadow}` }}
      >
        <a href="#" className="mr-2 text-[20px] font-semibold tracking-[-0.01em]" style={{ fontFamily: DISPLAY, color: SKY.ink }}>
          {brand}
        </a>
        <ul ref={listRef} className="relative m-0 hidden h-full flex-1 list-none items-center gap-1 p-0 @xl:flex">
          {/* The band, and a ghost of it under the link you point at. */}
          <span ref={ghostRef} aria-hidden className="au-band pointer-events-none absolute inset-x-0 bottom-[9px] h-[18px]" style={{ opacity: 0, clipPath: "inset(0 calc(100% - var(--au-r)) 0 var(--au-l) round 2px)" }}>
            {bandLayers(0.3)}
          </span>
          <span ref={bandRef} aria-hidden className="au-band pointer-events-none absolute inset-x-0 bottom-[9px] h-[18px]" style={{ opacity: 0, clipPath: "inset(0 calc(100% - var(--au-r)) 0 var(--au-l) round 2px)" }}>
            {bandLayers(1)}
          </span>
          {links.map((l) => {
            const on = l.href === current;
            return (
              <li key={l.href}>
                <a
                  ref={(n) => {
                    if (n) items.current.set(l.href, n);
                    else items.current.delete(l.href);
                  }}
                  href={safeHref(l.href)}
                  aria-current={on ? "page" : undefined}
                  onClick={() => choose(l.href)}
                  onPointerEnter={(e) => layBand(ghostRef.current, e.currentTarget, !reduced)}
                  onPointerLeave={() => layBand(ghostRef.current, undefined, !reduced)}
                  onFocus={(e) => layBand(ghostRef.current, e.currentTarget, !reduced)}
                  onBlur={() => layBand(ghostRef.current, undefined, !reduced)}
                  className="relative block rounded-full px-3.5 py-2 text-[14px] transition-colors duration-200"
                  style={{ color: on ? SKY.ink : SKY.ink2 }}
                >
                  {l.label}
                </a>
              </li>
            );
          })}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <button
            ref={menuBtn}
            type="button"
            aria-expanded={open}
            aria-controls={`${uid}-menu`}
            onClick={() => setOpen((o) => !o)}
            className="rounded-full px-3.5 py-2 text-[14px] @xl:hidden"
            style={{ color: SKY.ink2, boxShadow: `inset 0 0 0 1px ${SKY.line2}` }}
          >
            Menu
          </button>
          {cta && (
            <AuroraGlowButton href={cta.href} variant={ctaVariant} palette={palette}>
              {cta.label}
            </AuroraGlowButton>
          )}
        </div>
      </div>
      {open && (
        <ul
          id={`${uid}-menu`}
          className="au-drop absolute inset-x-0 top-[68px] m-0 grid list-none gap-1 rounded-[20px] p-2 @xl:hidden"
          style={{ background: "rgba(10,13,18,0.9)", WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)", boxShadow: `inset 0 0 0 1px ${SKY.line2}, ${SKY.shadow}`, animation: `au-drop 260ms ${EASE} both` }}
        >
          {links.map((l) => {
            const on = l.href === current;
            return (
              <li key={l.href}>
                <a href={safeHref(l.href)} aria-current={on ? "page" : undefined} onClick={() => choose(l.href)} className="relative flex items-center gap-3 rounded-[14px] px-4 py-3 text-[15px]" style={{ color: on ? SKY.ink : SKY.ink2 }}>
                  <span aria-hidden className="h-4 w-[2px] rounded-full" style={{ background: on ? `linear-gradient(${p.core}, ${p.core2})` : "transparent", boxShadow: on ? `0 0 10px ${p.core}` : "none" }} />
                  {l.label}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
