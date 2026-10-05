"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, FocusEvent as ReactFocusEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * BentoCommandNav — site navigation set as one compact row of bento tiles.
 *
 * The tiles share their hairlines: they sit a pixel apart on a hairline
 * ground, so every divider is the same 1px line and the row reads as one
 * object cut into cells rather than a bar with links on it. A single light
 * follows the pointer under the row and shows through those hairlines, so
 * the dividers nearest the pointer catch it. Size and luminance do the rest:
 * the current page is a raised cell, the empty cell in the middle is the
 * row's negative space, and the call to action is the only filled accent.
 *
 * An item with links opens a panel of tiles under the row, cut the same way,
 * with the first link as the big tile. It opens on hover (with intent
 * delays), on click and from the keyboard; Escape closes it and returns
 * focus. Below 56rem of container width the links fold into a Menu tile.
 *
 * Needs Tailwind v4 (container queries are built in). No dependencies beyond
 * React.
 */

export type BentoNavLink = {
  title: string;
  href: string;
  body?: string;
  /** A small mono label above the title. */
  meta?: string;
  /** A headline figure, shown on the big first tile only, e.g. "1.8s". */
  figure?: string;
  /** What the figure measures, in mono under it, e.g. "median build". */
  figureNote?: string;
};
export type BentoNavItem = {
  label: string;
  /** A plain link. Give `links` instead to open a panel. */
  href?: string;
  current?: boolean;
  links?: BentoNavLink[];
};

export type BentoCommandNavProps = {
  brand: { name: string; href?: string; mark?: ReactNode };
  items: BentoNavItem[];
  status?: { label: string; href?: string; tone?: "ok" | "busy" | "down" };
  secondary?: { label: string; href: string };
  cta?: { label: string; href: string };
  /** "#rrggbb"; the call to action is the only thing that wears it. */
  accent?: string;
  /** The nav landmark's accessible name. */
  label?: string;
  className?: string;
};

const MONO = "var(--font-mono, var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace))";
const OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const TONES = { ok: "#2bd576", busy: "#ffb020", down: "#ff5a5a" };
const MENU = "__menu";

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

function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.18;
}

function reduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Each state names its own background: two bg utilities on one element are
// resolved by stylesheet order, not by the order of the class list.
const CELL =
  "flex h-full items-center whitespace-nowrap outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80 motion-reduce:transition-none";
const REST = " text-[13px] font-medium bg-[#0f1012] text-white/65 hover:bg-[#16171a] hover:text-white";
const RAISED = " text-[13px] font-medium bg-[#16171a] text-white";
const TILE_LINK =
  "group flex h-full flex-col outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80 motion-reduce:transition-none";
const LABEL = "text-[11px] uppercase tracking-[0.12em] text-white/45";

/**
 * The shared-hairline ground: a 1px hairline under the cells, a light that
 * shows through it near the pointer, and a faint glow over the cells.
 */
function Ground({ children, className, style }: { children: ReactNode; className: string; style?: CSSProperties }) {
  return (
    <>
      <span aria-hidden className={"pointer-events-none absolute -z-10 rounded-[20px] " + className} style={{ ...style, background: "rgba(255,255,255,0.08)" }} />
      <span
        aria-hidden
        data-bcn-light=""
        className={"pointer-events-none absolute -z-10 rounded-[20px] transition-opacity duration-200 " + className}
        style={{
          ...style,
          opacity: "var(--bcn-o, 0)",
          background: "radial-gradient(180px circle at var(--bcn-x, -999px) var(--bcn-y, -999px), rgba(255,255,255,0.7), rgba(255,255,255,0) 70%)",
        }}
      />
      {children}
      <span
        aria-hidden
        data-bcn-light=""
        className={"pointer-events-none absolute rounded-[20px] transition-opacity duration-200 " + className}
        style={{
          ...style,
          opacity: "var(--bcn-o, 0)",
          background: "radial-gradient(260px circle at var(--bcn-x, -999px) var(--bcn-y, -999px), rgba(255,255,255,0.07), rgba(255,255,255,0) 70%)",
        }}
      />
    </>
  );
}

/**
 * A panel of tiles under the row, cut with the same shared hairlines. The
 * outer box's top padding bridges the gap, so the pointer can cross it.
 */
function Panel({
  id,
  active,
  grid,
  children,
}: {
  id: string;
  active: boolean;
  grid: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div id={id} inert={!active} className="absolute inset-x-0 top-full z-30 pt-2">
      <div className="relative isolate rounded-[20px] bg-[#08090a]">
        <Ground className="inset-0">
          <ul role="list" className="relative m-px grid gap-px overflow-hidden rounded-[19px]" style={grid}>
            {children}
          </ul>
        </Ground>
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className="transition-transform duration-300 motion-reduce:transition-none"
      style={{ transform: open ? "rotate(180deg)" : "none", transitionTimingFunction: OUT }}
    >
      <path d="M2 3.75 5 6.75 8 3.75" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BentoCommandNav({ brand, items, status, secondary, cta, accent, label = "Main", className = "" }: BentoCommandNavProps) {
  const uid = useId().replace(/:/g, "");
  const tint = safeHex(accent, "#ff5a1f");
  const ink = isLight(tint) ? "#0b0b0c" : "#ffffff";

  // `open` is what the triggers report; `shown` keeps a closing panel on
  // screen for its exit.
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const openedBy = useRef<"hover" | "click">("click");
  const timers = useRef({ open: 0, close: 0 });
  const navRef = useRef<HTMLElement>(null);
  const light = useRef({ x: 0, y: 0, raf: 0 });

  // Parts are found by id and data attribute, only in handlers and effects.
  const panelId = (id: string) => uid + "-" + id;
  function part(sel: string): HTMLElement | null {
    return navRef.current ? navRef.current.querySelector<HTMLElement>(sel) : null;
  }

  function clearTimers() {
    window.clearTimeout(timers.current.open);
    window.clearTimeout(timers.current.close);
  }
  function show(id: string, by: "hover" | "click") {
    clearTimers();
    openedBy.current = by;
    setOpen(id);
    setShown(id);
  }
  function hide(returnFocus = false) {
    clearTimers();
    if (returnFocus && open) part('[aria-controls="' + CSS.escape(panelId(open)) + '"]')?.focus();
    setOpen(null);
  }

  // Entrance: the panel opens downward from the row, its tiles just after.
  useEffect(() => {
    if (!shown || reduced()) return;
    const el = navRef.current?.querySelector<HTMLElement>("#" + CSS.escape(uid + "-" + shown));
    if (!el) return;
    const runs = [
      el.animate([{ clipPath: "inset(0 0 100% 0 round 20px)" }, { clipPath: "inset(0 0 0% 0 round 20px)" }], { duration: 300, easing: OUT }),
    ];
    el.querySelectorAll("li").forEach((li, i) => {
      runs.push(
        li.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], {
          duration: 260,
          delay: 40 + i * 60,
          easing: OUT,
          fill: "backwards",
        }),
      );
    });
    return () => runs.forEach((a) => a.cancel());
  }, [shown, uid]);

  // Exit: a short fade, then unmount. Reopening mid-exit cancels it.
  useEffect(() => {
    if (open || !shown) return;
    const el = navRef.current?.querySelector<HTMLElement>("#" + CSS.escape(uid + "-" + shown));
    if (!el || reduced()) {
      const t = window.setTimeout(() => setShown(null), 0);
      return () => window.clearTimeout(t);
    }
    const a = el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-4px)" }], {
      duration: 160,
      easing: "ease-out",
      fill: "forwards",
    });
    const t = window.setTimeout(() => setShown(null), 170);
    return () => {
      window.clearTimeout(t);
      a.cancel();
    };
  }, [open, shown, uid]);

  // A press anywhere outside the nav closes the panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    const t = timers.current;
    const l = light.current;
    return () => {
      window.clearTimeout(t.open);
      window.clearTimeout(t.close);
      cancelAnimationFrame(l.raf);
    };
  }, []);

  // One light for the row and any open panel, one write per animation frame.
  function onMove(e: ReactPointerEvent<HTMLElement>) {
    light.current.x = e.clientX;
    light.current.y = e.clientY;
    if (light.current.raf) return;
    const root = e.currentTarget;
    light.current.raf = requestAnimationFrame(() => {
      light.current.raf = 0;
      root.querySelectorAll<HTMLElement>("[data-bcn-light]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const k = el.offsetWidth / (r.width || 1);
        el.style.setProperty("--bcn-x", ((light.current.x - r.left) * k).toFixed(1) + "px");
        el.style.setProperty("--bcn-y", ((light.current.y - r.top) * k).toFixed(1) + "px");
      });
      root.style.setProperty("--bcn-o", "1");
    });
  }

  // Hover intent, for mouse pointers only: open after 80ms, close 180ms after
  // leaving, unless the panel was opened with a click.
  function enter(id: string, e: ReactPointerEvent) {
    if (e.pointerType !== "mouse") return;
    clearTimers();
    if (open === id) return;
    if (open) show(id, "hover");
    else timers.current.open = window.setTimeout(() => show(id, "hover"), 80);
  }
  function leave(e: ReactPointerEvent) {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(timers.current.open);
    if (open && openedBy.current === "hover") timers.current.close = window.setTimeout(() => setOpen(null), 180);
  }
  function press(id: string) {
    if (open === id && openedBy.current === "click") hide();
    else show(id, "click");
  }
  // Focus moving to another cell closes the open panel.
  function onFocusIn(e: ReactFocusEvent) {
    if (!open) return;
    const cell = part('[data-bcn-cell="' + CSS.escape(open) + '"]');
    if (cell && !cell.contains(e.target as Node)) setOpen(null);
  }


  function linkPanel(item: BentoNavItem, id: string) {
    const links = item.links ?? [];
    const rest = links.slice(1);
    const cols = Math.max(1, Math.ceil(rest.length / 2));
    return (
      <Panel
        id={panelId(id)}
        active={open === id}
        grid={{
          gridTemplateColumns: rest.length ? "minmax(0,1.3fr) repeat(" + cols + ", minmax(0,1fr))" : "minmax(0,1fr)",
          gridAutoRows: "minmax(104px, auto)",
        }}
      >
        {links.map((l, i) => {
          const big = i === 0;
          // Fill the block: an odd one out spans the empty cell it would leave.
          const odd = !big && rest.length % 2 === 1 && i === links.length - 1;
          const span = big ? "row-span-2" : odd ? (rest.length === 1 ? "row-span-2" : "col-span-2") : "";
          return (
            <li key={l.title + i} className={span}>
              <a href={safeHref(l.href)} className={TILE_LINK + " bg-[#0f1012] hover:bg-[#16171a]" + (big ? " p-6" : " p-5")}>
                {l.meta && (
                  <span className={LABEL} style={{ fontFamily: MONO }}>
                    {l.meta}
                  </span>
                )}
                <span className={(big ? "mt-2 text-[20px]" : "mt-1.5 text-[15px]") + " font-semibold tracking-[-0.01em] text-white"}>
                  {l.title}
                </span>
                {l.body && <span className={(big ? "mt-2 text-[14px]" : "mt-1 text-[13px]") + " leading-snug text-white/55"}>{l.body}</span>}
                <span className="mt-auto flex items-end justify-between gap-3 pt-4">
                  {big && l.figure ? (
                    <span className="flex flex-col gap-1.5">
                      <span className="text-[44px] font-bold leading-none tracking-[-0.04em] text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {l.figure}
                      </span>
                      {l.figureNote && (
                        <span className={LABEL} style={{ fontFamily: MONO }}>
                          {l.figureNote}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span
                    aria-hidden
                    className="text-white/40 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-white motion-reduce:transition-none"
                  >
                    →
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </Panel>
    );
  }

  // The folded menu: every destination as a tile, two to a row.
  const flat: (BentoNavLink & { current?: boolean })[] = [];
  items.forEach((it) => {
    if (it.links && it.links.length) it.links.forEach((l) => flat.push({ ...l, meta: it.label, body: undefined, figure: undefined, figureNote: undefined }));
    else if (it.href) flat.push({ title: it.label, href: it.href, current: it.current });
  });
  if (secondary) flat.push({ title: secondary.label, href: secondary.href });

  const tone = TONES[status?.tone ?? "ok"];
  const statusCls = "hidden items-center gap-2 whitespace-nowrap text-[11px] uppercase tracking-[0.12em] text-white/50 @5xl:flex";
  const statusBody = status && (
    <>
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: tone }} />
      {status.label}
    </>
  );

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className={"@container relative isolate w-full text-white " + className}
      style={{ "--bcn-o": "0" } as CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={(e) => {
        cancelAnimationFrame(light.current.raf);
        light.current.raf = 0;
        e.currentTarget.style.setProperty("--bcn-o", "0");
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          hide(true);
        }
      }}
      onFocus={onFocusIn}
    >
      <Ground className="inset-x-0 top-0 h-14">
        <ul role="list" className="m-px flex h-[54px] gap-px overflow-hidden rounded-[19px]">
          <li data-bcn-cell="brand" className="flex">
            <a href={safeHref(brand.href ?? "/")} className={CELL + " gap-2.5 bg-[#0f1012] pl-4 pr-5 text-[14px] font-semibold text-white hover:bg-[#16171a]"}>
              {brand.mark ?? (
                <span aria-hidden className="grid size-6 place-items-center rounded-[7px] bg-white text-[12px] font-bold text-black">
                  {brand.name.slice(0, 1)}
                </span>
              )}
              {brand.name}
            </a>
          </li>

          {items.map((it, i) => {
            const id = "i" + i;
            if (it.links && it.links.length) {
              const isOpen = open === id;
              return (
                <li
                  key={it.label + i}
                  data-bcn-cell={id}
                  className="hidden @4xl:flex"
                  onPointerEnter={(e) => enter(id, e)}
                  onPointerLeave={leave}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId(id)}
                    onClick={() => press(id)}
                    className={CELL + " gap-2 px-4" + (isOpen ? RAISED : REST)}
                  >
                    {it.label}
                    <Chevron open={isOpen} />
                  </button>
                  {shown === id && linkPanel(it, id)}
                </li>
              );
            }
            return (
              <li key={it.label + i} data-bcn-cell={id} className="hidden @4xl:flex">
                <a
                  href={safeHref(it.href ?? "#")}
                  aria-current={it.current ? "page" : undefined}
                  className={CELL + " gap-2 px-4" + (it.current ? RAISED : REST)}
                >
                  {it.current && <span aria-hidden className="size-1 rounded-full bg-white/80" />}
                  {it.label}
                </a>
              </li>
            );
          })}

          {/* The row's negative space, and the status when there is room. */}
          <li data-bcn-cell="fill" className="flex min-w-6 flex-1">
            <div className="flex h-full flex-1 items-center justify-end bg-[#0f1012] px-4">
              {status && status.href ? (
                <a
                  href={safeHref(status.href)}
                  className={statusCls + " rounded-[6px] outline-none transition-colors duration-200 hover:text-white focus-visible:ring-2 focus-visible:ring-white/80"}
                  style={{ fontFamily: MONO }}
                >
                  {statusBody}
                </a>
              ) : status ? (
                <span className={statusCls} style={{ fontFamily: MONO }}>
                  {statusBody}
                </span>
              ) : null}
            </div>
          </li>

          {secondary && (
            <li data-bcn-cell="secondary" className="hidden @4xl:flex">
              <a href={safeHref(secondary.href)} className={CELL + " px-4" + REST}>
                {secondary.label}
              </a>
            </li>
          )}

          {flat.length > 0 && (
            <li data-bcn-cell={MENU} className="flex @4xl:hidden">
              <button
                type="button"
                aria-expanded={open === MENU}
                aria-controls={panelId(MENU)}
                onClick={() => press(MENU)}
                className={CELL + " gap-2 px-4" + (open === MENU ? RAISED : REST)}
              >
                <svg aria-hidden width="14" height="14" viewBox="0 0 14 14">
                  <path
                    d={open === MENU ? "M3 3l8 8M11 3l-8 8" : "M2 5h10M2 9h10"}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Menu
              </button>
              {shown === MENU && (
                <Panel id={panelId(MENU)} active={open === MENU} grid={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))", gridAutoRows: "minmax(68px, auto)" }}>
                  {flat.map((l, i) => (
                    <li key={l.title + i} className={flat.length % 2 === 1 && i === flat.length - 1 ? "col-span-2" : ""}>
                      <a
                        href={safeHref(l.href)}
                        aria-current={l.current ? "page" : undefined}
                        className={TILE_LINK + " justify-center p-4" + (l.current ? " bg-[#16171a]" : " bg-[#0f1012] hover:bg-[#16171a]")}
                      >
                        {l.meta && (
                          <span className={LABEL} style={{ fontFamily: MONO }}>
                            {l.meta}
                          </span>
                        )}
                        <span className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-white">
                          {l.current && <span aria-hidden className="size-1 rounded-full bg-white/80" />}
                          {l.title}
                        </span>
                      </a>
                    </li>
                  ))}
                </Panel>
              )}
            </li>
          )}

          {cta && (
            <li data-bcn-cell="cta" className="flex">
              <a
                href={safeHref(cta.href)}
                className="group flex h-full items-center gap-2 whitespace-nowrap px-5 text-[13px] font-semibold outline-none transition-[filter] duration-200 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80 motion-reduce:transition-none"
                style={{ background: tint, color: ink }}
              >
                {cta.label}
                <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none">
                  →
                </span>
              </a>
            </li>
          )}
        </ul>
      </Ground>
    </nav>
  );
}
