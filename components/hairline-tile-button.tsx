"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * HairlineTileButton — a button that behaves like a live bento grid.
 *
 * At rest it is one flat tile: a tonal face, a 1px hairline, no shadow.
 * Point at it (or tab to it) and the face re-tiles into compartments along
 * hairline seams, one after another, 60ms apart on the kit's soft spring: the
 * label tile yields width, the keycaps take a compartment of their own, and
 * an arrow tile grows in from the trailing edge. Nothing lifts; the grid
 * divides. The layout never moves, only the tile surfaces do, so the button
 * keeps its width and never nudges its neighbours.
 *
 * - LIGHT ON THE SEAMS. A light under the pointer catches the outer hairline,
 *   every compartment's hairline and the seams between them.
 * - PRESS. The compartments compress toward the point you press (a tonal step
 *   down, no lift) and spring back on release. Touch presses re-tile too.
 * - REAL KEYCAPS. Pass `shortcut` ("shift+d", "mod+k", "/") and the keycaps
 *   are live: pressing that combination clicks the button and visibly
 *   depresses each cap. The listener only acts while the button is on screen
 *   and no text field has focus, and a held modifier depresses its own cap.
 *
 * Two variants: "tile" (the quiet default) and "accent", the one filled
 * colour a bento screen allows. Optional mono metadata above the label and a
 * leading icon. A link when you pass href (sanitised), otherwise a button.
 * Under prefers-reduced-motion the re-tile and the press are instant and
 * nothing compresses.
 *
 * Radius 14 is concentric with the kit's 20px tiles at a 6px inset; the
 * compartments sit 4px inside it at radius 10. Mono type comes from
 * --font-mono (or the site's --font-geist-mono) with a system fallback.
 *
 * One button per shortcut on a screen. Needs Tailwind v4 (or v3.4+) for the
 * few utility classes; the state styles ship in the component's own <style>.
 * No dependencies beyond React.
 */

type Variant = "tile" | "accent";
type Size = "md" | "lg";

const MONO = "var(--font-mono, var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace))";
const SPRING = "cubic-bezier(0.34,1.25,0.64,1)";
const OUT = "cubic-bezier(0.16,1,0.3,1)";
const RING_MASK =
  "-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;" +
  "mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);";

/** A state rule for "open": hover (only where hover exists), keyboard focus, or a press. */
function openRule(sel: string, body: string): string {
  return (
    ".htb:focus-visible" + sel + ",.htb[data-press]" + sel + "{" + body + "}" +
    "@media (hover:hover){.htb:hover" + sel + "{" + body + "}}"
  );
}

// Static CSS: every colour arrives through custom properties set inline from
// validated hex values, so nothing user-supplied is ever written in here.
const HTB_CSS =
  ".htb{position:relative;isolation:isolate;display:inline-flex;align-items:stretch;overflow:hidden;border-radius:14px;" +
  "background:var(--htb-grout);color:var(--htb-ink);text-align:left;text-decoration:none;user-select:none;-webkit-user-select:none;" +
  "-webkit-tap-highlight-color:transparent;touch-action:manipulation;cursor:pointer;outline:none;" +
  "transition:background-color 200ms " + OUT + "}" +
  ".htb:focus-visible{outline:2px solid var(--htb-ring);outline-offset:2px;border-radius:14px}" +
  ".htb:disabled{cursor:default;opacity:.4;pointer-events:none}" +
  ".htb-plate{position:relative;display:flex;flex:1 1 auto;min-width:0;transform-origin:var(--htb-px,50%) var(--htb-py,50%);" +
  "transition:transform 320ms " + SPRING + "}" +
  ".htb[data-press] .htb-plate{transform:scale(.965);transition:transform 110ms " + OUT + "}" +
  ".htb-under{position:absolute;inset:0;pointer-events:none;opacity:0;" +
  "background:radial-gradient(64px circle at var(--htb-x,-999px) var(--htb-y,-999px),var(--htb-seam),transparent 70%);" +
  "transition:opacity 200ms " + OUT + "}" +
  ".htb-s{position:absolute;pointer-events:none;top:4px;bottom:4px;width:0;border-radius:10px;background:var(--htb-tile);" +
  "box-shadow:inset 0 0 0 1px var(--htb-hair);" +
  "transition:top 280ms " + OUT + ",right 280ms " + OUT + ",bottom 280ms " + OUT + ",left 280ms " + OUT + ",width 280ms " + OUT +
  ",border-radius 280ms " + OUT + ",background-color 200ms " + OUT + ",box-shadow 200ms " + OUT + "}" +
  ".htb-s-l{top:0;right:0;bottom:0;left:0;width:auto;border-radius:14px;background:var(--htb-face);box-shadow:inset 0 0 0 1px transparent;transition-delay:80ms}" +
  ".htb-s-k{right:calc(4px + var(--htb-ag));background:var(--htb-well);transition-delay:40ms}" +
  ".htb-s-a{right:4px;transition-delay:0ms}" +
  ".htb-s::before{content:\"\";position:absolute;inset:0;border-radius:inherit;background:#000;opacity:0;transition:opacity 110ms " + OUT + "}" +
  ".htb-s::after{content:\"\";position:absolute;inset:0;border-radius:inherit;padding:1px;opacity:0;" +
  "background:radial-gradient(80px circle at var(--lx,-999px) var(--ly,-999px),var(--htb-glint),transparent 70%);" +
  RING_MASK + "transition:opacity 200ms " + OUT + "}" +
  ".htb[data-press] .htb-s::before{opacity:var(--htb-veil)}" +
  ".htb-row{position:relative;display:flex;flex:1 1 auto;min-width:0;align-items:stretch;gap:4px;padding:4px}" +
  ".htb-label{display:flex;flex:1 1 auto;min-width:0;align-items:center;gap:12px;padding:0 var(--htb-pad)}" +
  ".htb-keys{display:flex;flex:none;align-items:center;gap:4px;padding:0 6px}" +
  ".htb-arrow{display:flex;flex:none;align-items:center;justify-content:center;width:var(--htb-aw)}" +
  ".htb-glyph{display:inline-flex;opacity:.6;transform:translateX(-3px);transition:transform 320ms " + SPRING + ",opacity 200ms " + OUT + "}" +
  ".htb-cap{display:flex;height:24px;min-width:24px;align-items:center;justify-content:center;border-radius:6px;padding:0 6px;" +
  "font-size:11px;line-height:1;color:var(--htb-cap-ink);background:var(--htb-cap);" +
  "box-shadow:inset 0 -1px 0 rgba(0,0,0,.35),inset 0 0 0 1px var(--htb-cap-ring);" +
  "transition:transform 90ms linear,box-shadow 90ms linear,color 200ms " + OUT + "}" +
  ".htb-cap[data-down]{transform:translateY(1px);color:var(--htb-cap-hi);box-shadow:inset 0 1px 2px rgba(0,0,0,.45),inset 0 0 0 1px var(--htb-cap-ring)}" +
  ".htb-edge,.htb-ring{position:absolute;inset:0;pointer-events:none;border-radius:14px}" +
  ".htb-edge{box-shadow:inset 0 0 0 1px var(--htb-line);transition:box-shadow 200ms " + OUT + "}" +
  ".htb-ring{padding:1px;opacity:0;" +
  "background:radial-gradient(90px circle at var(--htb-x,-999px) var(--htb-y,-999px),var(--htb-glint-edge),transparent 70%);" +
  RING_MASK + "transition:opacity 200ms " + OUT + "}" +
  openRule("", "background:var(--htb-grout-open)") +
  openRule(" .htb-under", "opacity:1") +
  openRule(
    " .htb-s",
    "transition-duration:320ms,320ms,320ms,320ms,320ms,320ms,200ms,200ms;" +
      "transition-timing-function:" + SPRING + "," + SPRING + "," + SPRING + "," + SPRING + "," + SPRING + "," + SPRING + "," + OUT + "," + OUT,
  ) +
  openRule(
    " .htb-s-l",
    "top:4px;bottom:4px;left:4px;right:var(--htb-tail,48px);border-radius:10px;background:var(--htb-tile);" +
      "box-shadow:inset 0 0 0 1px var(--htb-hair);transition-delay:0ms",
  ) +
  openRule(" .htb-s-k", "width:var(--htb-kw,0px);transition-delay:60ms") +
  openRule(" .htb-s-a", "width:var(--htb-aw);transition-delay:120ms") +
  openRule(" .htb-s::after", "opacity:1") +
  openRule(" .htb-glyph", "opacity:1;transform:none;transition-delay:120ms,120ms") +
  openRule(" .htb-cap", "color:var(--htb-cap-hi)") +
  openRule(" .htb-edge", "box-shadow:inset 0 0 0 1px var(--htb-line-open)") +
  openRule(" .htb-ring", "opacity:1") +
  "@media (prefers-reduced-motion:reduce){.htb,.htb *,.htb *::before,.htb *::after{transition-duration:0ms!important;transition-delay:0ms!important}" +
  ".htb[data-press] .htb-plate{transform:none}}";

/** Allow relative paths, fragments, http(s), mailto and tel; anything else becomes "#". */
function safeHref(href: string): string {
  const v = href.replace(/[\t\n\r]/g, "").trim();
  if (v.indexOf(String.fromCharCode(92)) !== -1) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#?]/.test(v) && !/^\/\//.test(v)) return v;
  return "#";
}

/** "#rrggbb" if valid, otherwise the fallback. Never interpolated unchecked. */
function safeHex(hex: string | undefined, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex || "") ? (hex as string) : fallback;
}

/** Relative luminance, to pick dark or light text on the accent. */
function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.18;
}

/** Mixes two "#rrggbb" colours: t = 0 gives a, t = 1 gives b. */
function mix(a: string, b: string, t: number): string {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

// ---- Shortcuts ------------------------------------------------------------

type Mod = "mod" | "ctrl" | "meta" | "alt" | "shift";
type Combo = { key: string; mods: Mod[] };

const MOD_NAMES: Record<string, Mod> = {
  mod: "mod",
  ctrl: "ctrl",
  control: "ctrl",
  cmd: "meta",
  command: "meta",
  meta: "meta",
  alt: "alt",
  option: "alt",
  opt: "alt",
  shift: "shift",
};
/** Cap labels: [Mac, everywhere else]. */
const MOD_CAPS: Record<Mod, [string, string]> = {
  mod: ["⌘", "Ctrl"],
  ctrl: ["⌃", "Ctrl"],
  meta: ["⌘", "Meta"],
  alt: ["⌥", "Alt"],
  shift: ["⇧", "⇧"],
};
const MOD_ARIA: Record<Mod, [string, string]> = {
  mod: ["Meta", "Control"],
  ctrl: ["Control", "Control"],
  meta: ["Meta", "Meta"],
  alt: ["Alt", "Alt"],
  shift: ["Shift", "Shift"],
};
const KEY_CAPS: Record<string, string> = {
  enter: "↵",
  escape: "Esc",
  space: "Space",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  backspace: "⌫",
  delete: "Del",
  tab: "Tab",
};
const KEY_ARIA: Record<string, string> = {
  enter: "Enter",
  escape: "Escape",
  space: "Space",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  backspace: "Backspace",
  delete: "Delete",
  tab: "Tab",
};

/** "shift+d", "mod+k", "alt+enter", "/" -> a combo, or null if it cannot be read. */
function parseShortcut(s: string | undefined): Combo | null {
  if (!s) return null;
  const parts = s.split("+").map((p) => p.trim().toLowerCase());
  const raw = parts.pop();
  if (!raw) return null;
  const key = raw === "esc" ? "escape" : raw === "return" ? "enter" : raw;
  const mods: Mod[] = [];
  for (const p of parts) {
    const m = MOD_NAMES[p];
    if (!m) return null;
    if (mods.indexOf(m) === -1) mods.push(m);
  }
  return { key, mods };
}

function capLabel(key: string): string {
  if (KEY_CAPS[key]) return KEY_CAPS[key];
  return key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
}

/** Does this event carry the combo's key (modifiers aside)? Layout-proof for letters and digits. */
function hitsKey(c: Combo, e: KeyboardEvent): boolean {
  const k = e.key.toLowerCase();
  const want = c.key === "space" ? " " : c.key;
  if (k === want) return true;
  if (/^[a-z]$/.test(want)) return e.code === "Key" + want.toUpperCase();
  if (/^[0-9]$/.test(want)) return e.code === "Digit" + want;
  return false;
}

function matches(c: Combo, e: KeyboardEvent, mac: boolean): boolean {
  if (!hitsKey(c, e)) return false;
  const has = (m: Mod) => c.mods.indexOf(m) !== -1;
  const ctrl = has("ctrl") || (has("mod") && !mac);
  const meta = has("meta") || (has("mod") && mac);
  // Punctuation such as "?" needs Shift to be typed at all, so Shift is not held against it.
  const shiftFree = c.key.length === 1 && !/[a-z0-9]/.test(c.key);
  return e.ctrlKey === ctrl && e.metaKey === meta && e.altKey === has("alt") && (shiftFree || e.shiftKey === has("shift"));
}

/** True while focus is somewhere text can be typed. */
function isTyping(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return true;
  return t instanceof HTMLInputElement && !/^(button|checkbox|color|file|hidden|image|radio|range|reset|submit)$/i.test(t.type);
}

const noSubscribe = () => () => {};
/** Mac or not, read after hydration so the server and first client render agree. */
function useIsMac(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent),
    () => false,
  );
}

// ---- The button ------------------------------------------------------------

export function HairlineTileButton({
  children,
  href,
  onClick,
  type = "button",
  variant = "tile",
  size = "md",
  meta,
  kbd,
  shortcut,
  icon,
  arrow = true,
  accent = "#ff5a1f",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  /** Renders a link instead of a button. Sanitised. */
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: Variant;
  size?: Size;
  /** Mono metadata above the label, e.g. "v4.2" or "Status". */
  meta?: string;
  /** Keycap labels. With `shortcut` they only relabel its caps (same count); alone they are a static hint. */
  kbd?: string[];
  /** A live keyboard shortcut that clicks the button: "shift+d", "mod+k" (Cmd on Mac, Ctrl elsewhere), "alt+enter", "/". */
  shortcut?: string;
  icon?: ReactNode;
  /** The trailing tile: true for an arrow, false for none, or your own glyph. */
  arrow?: ReactNode;
  /** The one accent colour, "#rrggbb". */
  accent?: string;
  disabled?: boolean;
  className?: string;
}) {
  const a = safeHex(accent, "#ff5a1f");
  const filled = variant === "accent";
  const lightInk = filled && isLight(a);
  const ink = filled ? (lightInk ? "#0b0b0c" : "#ffffff") : "#f4f4f5";
  const mac = useIsMac();
  const combo = parseShortcut(shortcut);
  const aw = size === "lg" ? 48 : 36;
  const glyph = arrow === true ? "→" : arrow === false || arrow === null || arrow === undefined ? null : arrow;

  // The caps: the shortcut's own, relabelled by kbd when the counts agree, or a static kbd hint.
  const caps: { id: string; label: string }[] = combo
    ? combo.mods.map((m) => ({ id: m as string, label: MOD_CAPS[m][mac ? 0 : 1] })).concat({ id: "key", label: capLabel(combo.key) })
    : (kbd ?? []).map((k) => ({ id: "", label: k }));
  const labels = combo && kbd && kbd.length === caps.length ? kbd : null;
  const ariaKeys = combo
    ? combo.mods.map((m) => MOD_ARIA[m][mac ? 0 : 1]).concat(KEY_ARIA[combo.key] ?? (combo.key.length === 1 ? combo.key.toUpperCase() : combo.key)).join("+")
    : undefined;

  const aRef = useRef<HTMLAnchorElement>(null);
  const bRef = useRef<HTMLButtonElement>(null);
  const light = useRef({ x: 0, y: 0, raf: 0 });
  const asLink = !!href && !disabled;

  // The label tile's open width is "everything but the tail": measure the tail
  // (keycap and arrow compartments) whenever anything in the row resizes.
  const hasKeys = caps.length > 0;
  const hasGlyph = glyph !== null;
  useEffect(() => {
    const el = aRef.current ?? bRef.current;
    const row = el?.querySelector<HTMLElement>(".htb-row");
    const label = el?.querySelector<HTMLElement>(".htb-label");
    if (!el || !row || !label) return;
    const keys = el.querySelector<HTMLElement>(".htb-keys");
    const measure = () => {
      el.style.setProperty("--htb-tail", Math.max(0, row.offsetWidth - label.offsetLeft - label.offsetWidth) + "px");
      el.style.setProperty("--htb-kw", (keys ? keys.offsetWidth : 0) + "px");
    };
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    ro.observe(label);
    if (keys) ro.observe(keys);
    return () => ro.disconnect();
  }, [asLink, hasKeys, hasGlyph]);

  useEffect(() => {
    const l = light.current;
    return () => cancelAnimationFrame(l.raf);
  }, []);

  // The live shortcut: acts only while the button is on screen and nobody is typing.
  const shortcutKey = shortcut ?? "";
  useEffect(() => {
    const c = parseShortcut(shortcutKey);
    const el = aRef.current ?? bRef.current;
    if (!c || !el || disabled) return;
    let seen = false;
    const io = new IntersectionObserver((es) => {
      seen = es[es.length - 1].isIntersecting;
    });
    io.observe(el);
    let held = false;
    let since = 0;
    let timer = 0;
    const capEls = () => Array.from(el.querySelectorAll<HTMLElement>(".htb-cap[data-cap]"));
    const paintMods = (e: KeyboardEvent | null) => {
      capEls().forEach((cap) => {
        const id = cap.getAttribute("data-cap");
        if (id === "key") return;
        const down =
          !!e &&
          (id === "shift" ? e.shiftKey : id === "alt" ? e.altKey : id === "ctrl" ? e.ctrlKey : id === "meta" ? e.metaKey : id === "mod" ? (mac ? e.metaKey : e.ctrlKey) : false);
        cap.toggleAttribute("data-down", down);
      });
    };
    const keyCap = (down: boolean) => capEls().forEach((cap) => cap.getAttribute("data-cap") === "key" && cap.toggleAttribute("data-down", down));
    const release = () => {
      held = false;
      keyCap(false);
      el.removeAttribute("data-press");
    };
    const onDown = (e: KeyboardEvent) => {
      if (!seen || e.isComposing || isTyping(e.target) || isTyping(document.activeElement)) return;
      paintMods(e);
      if (!matches(c, e, mac) || e.defaultPrevented) return;
      e.preventDefault();
      if (e.repeat) return;
      window.clearTimeout(timer);
      held = true;
      since = e.timeStamp;
      keyCap(true);
      // The face compresses toward the keycap tile, then the button fires.
      const keys = el.querySelector<HTMLElement>(".htb-keys");
      if (keys) {
        el.style.setProperty("--htb-px", (keys.offsetLeft + keys.offsetWidth / 2).toFixed(1) + "px");
        el.style.setProperty("--htb-py", "50%");
      }
      el.setAttribute("data-press", "");
      el.click();
    };
    const onUp = (e: KeyboardEvent) => {
      paintMods(e);
      if (held && hitsKey(c, e)) {
        held = false;
        // Hold the press long enough to be seen, even for a quick tap.
        timer = window.setTimeout(release, Math.max(0, 140 - (e.timeStamp - since)));
      }
    };
    const clear = () => {
      window.clearTimeout(timer);
      release();
      paintMods(null);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      io.disconnect();
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, [shortcutKey, disabled, mac, asLink]);

  /** The pointer in the button's own layout pixels, even inside a transform-scaled container. */
  function point(e: ReactPointerEvent<HTMLElement>) {
    const t = e.currentTarget;
    const r = t.getBoundingClientRect();
    const k = t.offsetWidth / (r.width || 1);
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  }

  // One light, written at most once per frame: the outer hairline, the seams
  // under the compartments, and each compartment's own hairline.
  function paintLight(t: HTMLElement) {
    const { x, y } = light.current;
    t.style.setProperty("--htb-x", x.toFixed(1) + "px");
    t.style.setProperty("--htb-y", y.toFixed(1) + "px");
    t.querySelectorAll<HTMLElement>(".htb-s").forEach((s) => {
      s.style.setProperty("--lx", (x - s.offsetLeft).toFixed(1) + "px");
      s.style.setProperty("--ly", (y - s.offsetTop).toFixed(1) + "px");
    });
  }
  function onMove(e: ReactPointerEvent<HTMLElement>) {
    const p = point(e);
    light.current.x = p.x;
    light.current.y = p.y;
    if (light.current.raf) return;
    const t = e.currentTarget;
    light.current.raf = requestAnimationFrame(() => {
      light.current.raf = 0;
      paintLight(t);
    });
  }
  function onDown(e: ReactPointerEvent<HTMLElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const t = e.currentTarget;
    const p = point(e);
    light.current.x = p.x;
    light.current.y = p.y;
    paintLight(t);
    t.style.setProperty("--htb-px", p.x.toFixed(1) + "px");
    t.style.setProperty("--htb-py", p.y.toFixed(1) + "px");
    t.setAttribute("data-press", "");
  }
  function onUp(e: ReactPointerEvent<HTMLElement>) {
    e.currentTarget.removeAttribute("data-press");
  }
  function onLeave(e: ReactPointerEvent<HTMLElement>) {
    cancelAnimationFrame(light.current.raf);
    light.current.raf = 0;
    e.currentTarget.removeAttribute("data-press");
  }
  function onFocus(e: { currentTarget: HTMLElement }) {
    // A keyboard arrival has no pointer: park the light off the button.
    const t = e.currentTarget;
    if (!t.matches(":focus-visible")) return;
    t.style.removeProperty("--htb-x");
    t.style.removeProperty("--htb-y");
    t.querySelectorAll<HTMLElement>(".htb-s").forEach((s) => {
      s.style.removeProperty("--lx");
      s.style.removeProperty("--ly");
    });
  }
  function onBlur(e: { currentTarget: HTMLElement }) {
    e.currentTarget.removeAttribute("data-press");
  }
  function onKeyDown(e: ReactKeyboardEvent<HTMLElement>) {
    if (e.repeat) return;
    const t = e.currentTarget;
    if (e.key === "Enter" || (e.key === " " && t.tagName === "BUTTON")) {
      t.style.removeProperty("--htb-px");
      t.style.removeProperty("--htb-py");
      t.setAttribute("data-press", "");
    }
  }
  function onKeyUp(e: ReactKeyboardEvent<HTMLElement>) {
    if (e.key === "Enter" || e.key === " ") e.currentTarget.removeAttribute("data-press");
  }

  const style = {
    color: ink,
    minHeight: size === "lg" ? 56 : 44,
    "--htb-ink": ink,
    "--htb-face": filled ? a : "#0f1012",
    "--htb-grout": filled ? a : "#0f1012",
    "--htb-grout-open": filled ? mix(a, "#000000", 0.34) : "#08090a",
    "--htb-tile": filled ? a : "#16171a",
    "--htb-well": filled ? mix(a, "#000000", 0.14) : "#131417",
    "--htb-hair": filled ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
    "--htb-line": filled ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
    "--htb-line-open": filled ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.16)",
    "--htb-glint": filled ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)",
    "--htb-glint-edge": filled ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)",
    "--htb-seam": filled ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.24)",
    "--htb-veil": filled ? 0.14 : 0.32,
    "--htb-ring": filled ? "#ffffff" : a,
    "--htb-pad": size === "lg" ? "16px" : "12px",
    "--htb-aw": aw + "px",
    "--htb-ag": glyph !== null ? aw + 4 + "px" : "0px",
    "--htb-cap": filled ? "rgba(0,0,0,0.14)" : "#16171a",
    "--htb-cap-ring": filled ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.1)",
    "--htb-cap-ink": filled ? ink : "rgba(255,255,255,0.6)",
    "--htb-cap-hi": filled ? ink : "#ffffff",
  } as CSSProperties;

  const cls = "htb " + (size === "lg" ? "text-[15px] " : "text-[14px] ") + className;

  const inner = (
    <>
      <span className="htb-plate">
        {/* Under the compartments: the light that shows through the seams. */}
        <span aria-hidden className="htb-under" />
        {/* The tile surfaces. At rest the label tile is the whole face. */}
        <span aria-hidden className="htb-s htb-s-l" />
        {caps.length > 0 && <span aria-hidden className="htb-s htb-s-k" />}
        {glyph !== null && <span aria-hidden className="htb-s htb-s-a" />}
        <span className="htb-row">
          <span className="htb-label">
            {icon && (
              <span aria-hidden className="relative flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-[18px] [&>svg]:w-[18px]">
                {icon}
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              {meta && (
                <span className="text-[11px] uppercase leading-[14px] tracking-[0.12em]" style={{ fontFamily: MONO, opacity: filled ? 0.7 : 0.5 }}>
                  {meta}
                </span>
              )}
              <span className="truncate font-medium tracking-[-0.01em]">{children}</span>
            </span>
          </span>
          {caps.length > 0 && (
            <span aria-hidden className="htb-keys">
              {caps.map((c, i) => (
                <kbd key={i} className="htb-cap" data-cap={c.id || undefined} style={{ fontFamily: MONO }}>
                  {labels ? labels[i] : c.label}
                </kbd>
              ))}
            </span>
          )}
          {glyph !== null && (
            <span aria-hidden className="htb-arrow">
              <span className="htb-glyph">{glyph}</span>
            </span>
          )}
        </span>
      </span>
      <span aria-hidden className="htb-edge" />
      <span aria-hidden className="htb-ring" />
    </>
  );

  return (
    <>
      <style>{HTB_CSS}</style>
      {asLink ? (
        <a
          ref={aRef}
          href={safeHref(href as string)}
          onClick={onClick}
          aria-keyshortcuts={ariaKeys}
          className={cls}
          style={style}
          onPointerMove={onMove}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onLeave}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        >
          {inner}
        </a>
      ) : (
        <button
          ref={bRef}
          type={type}
          onClick={onClick}
          disabled={disabled}
          aria-keyshortcuts={ariaKeys}
          className={cls}
          style={style}
          onPointerMove={onMove}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onLeave}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        >
          {inner}
        </button>
      )}
    </>
  );
}
