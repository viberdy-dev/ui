"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * CurvedRailNav — a nav whose links ride a shallow cylinder.
 *
 * In real perspective, the active link stands forward, lifted and underlit
 * in copper; choose another and the rail turns toward it on a spring while
 * the rest recede along the curve. Hover or focus lifts a link 12px, and the
 * rail leans toward the pointer. Controlled or not; folds into a menu on
 * narrow containers. CSS 3D.
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
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries plugin).
 */

const SANS = 'var(--font-sans, "Geist", "Inter", ui-sans-serif, system-ui, sans-serif)';

const MONO = 'var(--font-mono, "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace)';

const DISPLAY = 'var(--font-hanken, "Hanken Grotesk", var(--font-sans, "Geist"), ui-sans-serif, system-ui, sans-serif)';

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** The dark studio the kit is set in. */
const ROOM = {
  ground: "#0a0a0d",
  panel: "#101114",
  raised: "#16171b",
  ink: "rgba(242,241,238,0.92)",
  ink2: "rgba(242,241,238,0.6)",
  ink3: "rgba(242,241,238,0.38)",
  line: "rgba(242,241,238,0.08)",
  line2: "rgba(242,241,238,0.16)",
  copper: "#ff7a3d",
} as const;

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

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
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
const FOCUS_CSS = ".s3-scope :focus-visible,.s3-scope:focus-visible{outline:2px solid var(--s3-ring,#ff7a3d);outline-offset:3px;border-radius:revert-layer}";

export type S3Link = { label: string; href: string };

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

const RAIL_STEP = 8.5;

const RAIL_SLOT = 132;

const RAIL_CSS =
  ".s3-rail{transition:transform 560ms cubic-bezier(.34,1.3,.64,1)}" +
  ".s3-rail-item{transition:transform 420ms cubic-bezier(.34,1.3,.64,1),color 220ms,opacity 220ms}" +
  ".s3-rail-glow{transition:opacity 260ms,transform 420ms cubic-bezier(.34,1.3,.64,1)}" +
  "@keyframes s3-drop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}" +
  "@media (prefers-reduced-motion: reduce){.s3-rail,.s3-rail-item,.s3-rail-glow{transition:none!important}.s3-drop{animation:none!important}}";

export type CurvedRailNavProps = {
  brand: string;
  links: S3Link[];
  cta?: S3Link;
  /** The active link's href, when the page controls it (a scroll spy). */
  active?: string;
  defaultActive?: string;
  onNavigate?: (href: string) => void;
  className?: string;
};

/**
 * A nav whose links ride a shallow cylinder in real perspective. The active
 * link stands forward, lifted and underlit in copper; choose another and the
 * whole rail turns toward it (560ms, a spring with a slight overshoot) while
 * the rest recede along the curve, never so far that they stop reading. Hovering or focusing a link lifts it 12px toward you, and the rail
 * leans a few degrees toward the pointer. Controlled (a scroll spy) or not;
 * on a narrow container the links fold into a menu. The call to action is the
 * kit's keycap.
 */
export function CurvedRailNav({ brand, links, cta, active, defaultActive, onNavigate, className }: CurvedRailNavProps) {
  const [chosen, setChosen] = useState(defaultActive ?? links[0]?.href ?? "");
  const [open, setOpen] = useState(false);
  const [lean, setLean] = useState(0);
  const [hover, setHover] = useState(-1);
  const current = active ?? chosen;
  const on = Math.max(0, links.findIndex((l) => l.href === current));
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const reduced = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(0);
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setRoom(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Turning the rail toward an end link also slides the row sideways (by about 0.4 of a slot per link from the middle), so budget for it.
  const slot = room ? clamp(Math.floor(room / (links.length + (links.length - 1) * 0.4)), 80, RAIL_SLOT) : RAIL_SLOT;
  const R = slot / (2 * Math.tan((RAIL_STEP * Math.PI) / 360));
  const mid = (links.length - 1) / 2;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!menuRef.current?.contains(n) && !toggleRef.current?.contains(n)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const go = (href: string) => {
    setChosen(href);
    setOpen(false);
    onNavigate?.(href);
  };
  const click = (e: { preventDefault: () => void }, href: string) => {
    if (href.startsWith("#") && onNavigate) e.preventDefault();
    go(href);
  };

  return (
    <header className={"s3-scope @container relative w-full " + (className ?? "")} style={{ background: "rgba(10,10,13,0.82)", color: ROOM.ink, backdropFilter: "blur(14px) saturate(120%)", "--s3-ring": ROOM.copper } as CSSProperties}>
      <style>{FOCUS_CSS + RAIL_CSS}</style>
      <nav aria-label="Main" className="flex h-16 items-center gap-6 border-b px-5 @3xl:h-[76px] @3xl:px-8" style={{ borderColor: ROOM.line }}>
        <a
          href="#"
          className="flex shrink-0 items-center gap-2 text-[20px] font-bold tracking-[-0.02em]"
          style={{ fontFamily: DISPLAY, color: "#f2f1ee" }}
          onClick={(e) => {
            if (!onNavigate) return;
            e.preventDefault();
            onNavigate("#top");
          }}
        >
          <span aria-hidden className="size-2 rounded-full" style={{ background: ROOM.copper, boxShadow: "0 0 10px rgba(255,122,61,0.8)" }} />
          {brand}
        </a>
        <div
          ref={railRef}
          className="relative mx-auto hidden h-full min-w-0 flex-1 overflow-hidden @3xl:block"
          style={{ perspective: 900 }}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            if (!reduced) setLean(((e.clientX - r.left) / r.width - 0.5) * 6);
          }}
          onPointerLeave={() => setLean(0)}
        >
          <ul className="s3-rail absolute left-1/2 top-1/2 m-0 h-0 w-0 list-none p-0" style={{ transformStyle: "preserve-3d", transform: `translateZ(${(-R).toFixed(1)}px) rotateY(${(-(on - mid) * RAIL_STEP * 0.4 + lean).toFixed(2)}deg)` }}>
            {links.map((l, i) => {
              const isOn = i === on;
              const lift = isOn ? 26 : i === hover ? 12 : 0;
              return (
                <li key={l.href} className="absolute" style={{ transformStyle: "preserve-3d", transform: `rotateY(${((i - mid) * RAIL_STEP).toFixed(2)}deg) translateZ(${R.toFixed(1)}px)` }}>
                  <a
                    href={safeHref(l.href)}
                    aria-current={isOn ? "page" : undefined}
                    onClick={(e) => click(e, l.href)}
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(-1)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(-1)}
                    className="s3-rail-item absolute flex items-center justify-center whitespace-nowrap rounded-[14px] px-3 py-2.5 text-[14px]"
                    style={{
                      width: slot - 8,
                      transform: `translate(-50%, -50%) translateZ(${lift}px)`,
                      color: isOn ? "#f2f1ee" : ROOM.ink2,
                      fontFamily: SANS,
                      fontWeight: isOn ? 600 : 500,
                      background: isOn ? "linear-gradient(180deg, rgba(242,241,238,0.08), rgba(242,241,238,0.02))" : "transparent",
                      boxShadow: isOn ? "inset 0 0 0 1px rgba(242,241,238,0.14)" : "none",
                    }}
                  >
                    {l.label}
                    <span aria-hidden className="s3-rail-glow absolute inset-x-5 -bottom-px h-px" style={{ opacity: isOn ? 1 : 0, background: ROOM.copper, boxShadow: "0 0 10px 1px rgba(255,122,61,0.7)" }} />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="ml-auto flex items-center gap-3 @3xl:ml-0">
          {cta ? (
            <span className="hidden @xl:inline-flex">
              <KeycapButton href={cta.href} size="md">
                {cta.label}
              </KeycapButton>
            </span>
          ) : null}
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 items-center rounded-[14px] border px-4 text-[12px] uppercase tracking-[0.14em] @3xl:hidden"
            style={{ fontFamily: MONO, borderColor: ROOM.line2 }}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </nav>
      <div ref={menuRef} id={panelId} hidden={!open} className="s3-drop absolute inset-x-0 top-full z-20 border-b px-5 pb-6 pt-3 @3xl:hidden" style={{ background: ROOM.ground, borderColor: ROOM.line, animation: `s3-drop 240ms ${EASE}` }}>
        <ul className="m-0 list-none p-0">
          {links.map((l, i) => (
            <li key={l.href} className="border-b last:border-b-0" style={{ borderColor: ROOM.line }}>
              <a href={safeHref(l.href)} aria-current={i === on ? "page" : undefined} onClick={(e) => click(e, l.href)} className="flex items-center gap-3 py-3.5 text-[22px] font-semibold tracking-[-0.02em]" style={{ fontFamily: DISPLAY, color: i === on ? "#f2f1ee" : ROOM.ink2 }}>
                <span aria-hidden className="size-1.5 rounded-full" style={{ background: i === on ? ROOM.copper : "transparent" }} />
                {l.label}
              </a>
            </li>
          ))}
          {cta ? (
            <li className="pt-4 @xl:hidden">
              <KeycapButton href={cta.href} size="md">
                {cta.label}
              </KeycapButton>
            </li>
          ) : null}
        </ul>
      </div>
    </header>
  );
}
