"use client";

import { useId, useRef, useState } from "react";

/**
 * HeadlineSwitchHero — the trade you do is the headline, and the headline is
 * the navigation.
 *
 * "Fitted for" and then, at the same size, KITCHENS / BATHROOMS / LOFTS. The
 * chosen word is solid ink; the others are hollow outlines. Choosing one
 * swaps the photo plate on the right, the line of copy and the "from" price in
 * the plate's corner. Nothing changes on a timer: the visitor decides what
 * they are looking at, and the page answers.
 *
 * IT IS A TABLIST. The words are real tabs (role="tab", aria-selected, roving
 * tabindex) inside a tablist, and arrow keys move between them, so a keyboard
 * user gets exactly what a mouse user gets. The plate is a tabpanel.
 *
 * ONE SATURATED FIELD. The plate colour is the only large area of colour on
 * the page. Photographs are greyscaled and multiplied into it, so any three
 * photos from the van read as one series. The button is ink, not accent — one
 * field per screen.
 *
 * Needs Tailwind v4 (container queries are built in).
 */

export type Trade = {
  /** The headline word. Keep it to one word; it is set very large. */
  word: string;
  /** One line under the headline. */
  copy: string;
  /** Photo for the plate. http(s), root-relative or data:image only. */
  image?: string;
  /** Mono microcopy in the plate's corner: "from £8,500 · 3–5 weeks". */
  meta?: string;
  /** Where the button goes for this trade. Falls back to ctaHref. */
  href?: string;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function hex(v: string, fallback: string) {
  return HEX.test(v) ? v : fallback;
}
function rgba(colour: string, alpha: number) {
  let h = colour.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
}

/**
 * Relative paths, fragments, http(s), mailto and tel; anything else becomes
 * "#". Judged on the URL the browser will see: a URL parser deletes tabs and
 * newlines anywhere and reads "\" as "/", so "/\t/evil.com" and "/\evil.com"
 * are both "//evil.com" — another site dressed as a local path.
 */
function safeHref(href: string) {
  const h = href.replace(/[\t\n\r]/g, "").trim();
  if (h.includes("\\")) return "#";
  if (/^(\/(?!\/)|#|\?|\.{1,2}\/)/.test(h)) return h;
  if (/^(https?:|mailto:|tel:)/i.test(h)) return h;
  return "#";
}

/** Images: http(s), root-relative or data:image only — judged like safeHref. */
function safeSrc(src?: string) {
  if (!src) return "";
  const s = src.replace(/[\t\n\r]/g, "").trim();
  if (s.includes("\\")) return "";
  return /^(https?:\/\/|\/(?!\/)|data:image\/)/i.test(s) ? s : "";
}

// Static text only; no prop ever reaches this style element.
const CSS =
  "@keyframes hsh-in{from{opacity:0}to{opacity:1}}" +
  "@media (prefers-reduced-motion:reduce){[data-hsh-motion]{animation:none!important;transition:none!important}}";

export function HeadlineSwitchHero({
  trades,
  lead = "Fitted for",
  field = "#c8452c",
  paper = "#f4f2ee",
  ink = "#111111",
  ctaLabel = "Get a quote",
  ctaHref = "#quote",
  phone,
  tag,
  defaultIndex = 0,
  onChange,
  className = "",
}: {
  trades: Trade[];
  /** The first line of the headline. */
  lead?: string;
  /** The plate colour. Hex only. */
  field?: string;
  paper?: string;
  ink?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Shown beside the button as a tel: link. */
  phone?: string;
  /** Mono microcopy top-left: "Est. 2011 · Bristol". */
  tag?: string;
  defaultIndex?: number;
  onChange?: (trade: Trade, index: number) => void;
  className?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [active, setActive] = useState(Math.min(defaultIndex, Math.max(0, trades.length - 1)));
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // Plate layers: each choice adds a layer that fades in over the last one.
  // Only the last two are kept. Render-time adjustment, not an effect.
  const [layers, setLayers] = useState([{ index: active, n: 0 }]);
  const [seen, setSeen] = useState(active);
  if (active !== seen) {
    setSeen(active);
    setLayers((l) => [...l.slice(-1), { index: active, n: (l[l.length - 1]?.n ?? 0) + 1 }]);
  }

  const plate = hex(field, "#c8452c");
  const pa = hex(paper, "#f4f2ee");
  const ik = hex(ink, "#111111");
  const trade = trades[active];

  function choose(i: number) {
    if (i === active || !trades[i]) return;
    setActive(i);
    onChange?.(trades[i], i);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const n = trades.length;
    let j = active;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (active + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (active - 1 + n) % n;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = n - 1;
    else return;
    e.preventDefault();
    choose(j);
    tabs.current[j]?.focus();
  }

  return (
    <section
      className={"@container relative h-full overflow-hidden font-sans " + className}
      style={{ background: pa, color: ik }}
    >
      <style>{CSS}</style>
      {/* A container query answers to an ANCESTOR container, so the layout that
          switches at @3xl lives on this inner box, never on the section itself. */}
      <div className="flex h-full flex-col @3xl:flex-row">

      {/* The plate. On a phone it is a band across the top; wide, it is the right third. */}
      <div
        id={id + "-panel"}
        role="tabpanel"
        aria-labelledby={id + "-tab-" + active}
        className="relative order-first h-[38%] shrink-0 @3xl:order-last @3xl:h-auto @3xl:w-[42%]"
        style={{ background: plate }}
      >
        {layers.map((layer) => {
          const t = trades[layer.index];
          const src = safeSrc(t?.image);
          return (
            <div key={layer.n} data-hsh-motion="" className="absolute inset-0" style={{ animation: "hsh-in 700ms " + EASE }}>
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                  style={{ filter: "grayscale(1) contrast(1.25) brightness(1.05)", mixBlendMode: "multiply", opacity: 0.92 }}
                />
              ) : (
                <div className="h-full w-full" style={{ background: rgba(ik, 0.18) }} />
              )}
            </div>
          );
        })}
        {/* Plate corners: index top-right, the price and lead time bottom-left. */}
        <span
          aria-hidden="true"
          className="absolute top-5 right-5 font-mono text-[11px] tracking-[0.16em] tabular-nums uppercase"
          style={{ color: pa }}
        >
          {String(active + 1).padStart(2, "0")} / {String(trades.length).padStart(2, "0")}
        </span>
        {trade?.meta && (
          <span
            key={active}
            data-hsh-motion=""
            className="absolute bottom-5 left-5 font-mono text-[11px] tracking-[0.16em] uppercase"
            style={{ color: pa, animation: "hsh-in 700ms " + EASE }}
          >
            {trade.meta}
          </span>
        )}
      </div>

      {/* The copy. */}
      <div className="relative flex min-h-0 flex-1 flex-col justify-between px-6 pt-6 pb-6 @3xl:px-14 @3xl:pt-10 @3xl:pb-12">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase" style={{ color: rgba(ik, 0.6) }}>
          {tag}
        </p>

        <div className="my-4 min-w-0 @3xl:my-0">
          <h1 className="font-black tracking-[-0.05em] uppercase">
            <span className="block text-[44px] leading-[0.86] @3xl:text-[112px]">{lead}</span>
            {/* The second line is the navigation. */}
            <span
              role="tablist"
              aria-label="What we do"
              onKeyDown={onKeyDown}
              className="mt-1 flex flex-wrap gap-x-[0.28em] text-[44px] leading-[0.86] @3xl:mt-2 @3xl:text-[112px]"
            >
              {trades.map((t, i) => {
                const on = i === active;
                return (
                  <button
                    key={t.word + i}
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    id={id + "-tab-" + i}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-controls={id + "-panel"}
                    tabIndex={on ? 0 : -1}
                    onClick={() => choose(i)}
                    data-hsh-motion=""
                    className="cursor-pointer rounded-[2px] font-black uppercase outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
                    style={{
                      // Hollow when not chosen: the same word, drawn as an outline.
                      color: on ? ik : "transparent",
                      WebkitTextStroke: on ? "0" : "1.5px " + rgba(ik, 0.7),
                      transition: "color 500ms " + EASE + ", -webkit-text-stroke-color 500ms " + EASE,
                    }}
                  >
                    {t.word}
                  </button>
                );
              })}
            </span>
          </h1>
        </div>

        <div className="flex flex-col gap-5 @3xl:flex-row @3xl:items-end @3xl:justify-between @3xl:gap-8">
          <p
            key={active}
            data-hsh-motion=""
            className="max-w-[36ch] text-[15px] leading-[1.45] @3xl:text-[18px]"
            style={{ animation: "hsh-in 700ms " + EASE, color: rgba(ik, 0.82) }}
          >
            {trade?.copy}
          </p>
          <div className="flex shrink-0 items-center gap-5">
            <a
              href={safeHref(trade?.href ?? ctaHref)}
              className="inline-flex h-11 items-center px-5 font-mono text-[12px] tracking-[0.14em] uppercase transition-transform duration-300 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              style={{ background: ik, color: pa }}
            >
              {ctaLabel}
            </a>
            {phone && (
              <a
                href={"tel:" + phone.replace(/[^+\d]/g, "")}
                className="font-mono text-[12px] tracking-[0.14em] uppercase underline-offset-4 hover:underline"
              >
                {phone}
              </a>
            )}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
