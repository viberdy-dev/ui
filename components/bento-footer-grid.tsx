"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

/**
 * BentoFooterGrid — a site footer set as bento tiles, and the tiles are live.
 *
 * The brand is the one 2x2: mark, a line about what you make, and your
 * social links. Each sitemap column is a 1x2 tile. Around them:
 *
 * - STATUS. Your headline uptime over a 90-day strip of bars, one per day.
 *   Point along the strip (or focus it and use the arrow keys) and a readout
 *   names the day, its uptime and what happened. Today's bar and the headline
 *   figure take the status tone, and today's bar breathes on one slow
 *   10-second pulse while the footer is on screen.
 * - BACK TO TOP. A ring that fills with the reader's scroll progress; press
 *   it and the page glides back up (instantly under reduced motion) while
 *   the ring drains.
 * - NEWSLETTER. Focus the field and the tile expands across its whole row;
 *   the tiles beside it reflow into the row below on a FLIP spring. Leave it
 *   empty and it folds back when focus moves on.
 * - WORDMARK. Your name set huge and cropped by its tile. It is scroll-linked:
 *   as the footer arrives it rises inside its crop, and sinks again if you
 *   scroll back up.
 *
 * Depth is luminance and a 1px hairline; a light that follows the pointer
 * catches the hairlines near it. The subscribe button is the only accent;
 * the status tone is semantic, confined to the dot, today's bar and the
 * figure. Motion runs only while the footer is on screen and never under
 * prefers-reduced-motion.
 *
 * Scroll: by default everything follows the page (the window). Pass
 * scroll="self" when the footer lives in a fixed-height frame that scrolls
 * on its own (a preview, a modal, a docs pane): it then follows its nearest
 * scrolling ancestor.
 *
 * Layout: three or four sitemap columns keep the grid whole. With three, the
 * back-to-top tile stands tall beside them; with four, it moves down beside
 * the status.
 *
 * The newsletter calls your `onSubscribe(email)`; resolve when the address
 * is stored, throw to show the error line. Nothing is sent anywhere else.
 * FOOTER_DEMO below is placeholder content, including a seeded, invented
 * uptime history: never ship it as your status.
 *
 * Needs Tailwind v4 (on v3.4, add the @tailwindcss/container-queries
 * plugin). No dependencies beyond React.
 */

export type FooterLink = { label: string; href: string };
export type FooterColumn = { title: string; links: FooterLink[] };
/** One day of uptime. Pass them oldest first; the last day is today. */
export type UptimeDay = {
  /** Percent, 0 to 100. */
  uptime: number;
  /** "yyyy-mm-dd". Without it the readout counts back from today ("12 days ago"). */
  date?: string;
  /** What happened that day, shown in the readout. */
  note?: string;
};
export type FooterStatus = {
  label: string;
  /** The headline figure. Defaults to the mean of `days`. */
  value?: string;
  caption?: string;
  /** Makes the label a link to your status page. */
  href?: string;
  /** Colours the dot, today's bar and the headline figure. */
  tone?: "ok" | "busy" | "down";
  /** Up to 90 days, oldest first. From your status provider. */
  days?: UptimeDay[];
};

export type BentoFooterGridProps = {
  brand: { name: string; pitch?: string; href?: string; mark?: ReactNode };
  socials?: FooterLink[];
  /** Three or four columns; up to five links fit a 1x2 tile. */
  columns: FooterColumn[];
  status?: FooterStatus;
  newsletter?: {
    title: string;
    placeholder?: string;
    cta?: string;
    /** Store the address. Resolve on success; throw to show the error line. */
    onSubscribe: (email: string) => Promise<void> | void;
  };
  legal?: { owner: string; year?: number; links?: FooterLink[] };
  backToTop?: boolean;
  /** Close the page with the brand name set huge, cropped and scroll-linked. */
  wordmark?: boolean;
  accent?: string;
  /** "page" follows the window; "self" follows the nearest scrolling ancestor (a fixed-height frame). */
  scroll?: "page" | "self";
  className?: string;
};

const MONO = "var(--font-mono, var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace))";
const OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const SPRING = "cubic-bezier(0.34, 1.25, 0.64, 1)";
const TONES = { ok: "#2bd576", busy: "#ffb020", down: "#ff5a5a" };
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[^\s@.]{2,}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** The wordmark's crop: where it starts as the tile arrives, and where it settles. */
const MARK_FROM = 64;
const MARK_TO = 18;

// Today's heartbeat: steady, then one slow dip every 10 seconds, only while live.
const BFG_CSS =
  "@keyframes bfg-beat{0%,64%,100%{opacity:1}82%{opacity:.35}}" +
  ".bfg-beat{animation:bfg-beat 10s ease-in-out infinite;animation-play-state:paused}" +
  "[data-bfg-live] .bfg-beat{animation-play-state:running}" +
  "@media (prefers-reduced-motion:reduce){.bfg-beat{animation:none}}";

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
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The nearest ancestor that scrolls vertically, or null. */
function scroller(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement;
  while (p) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === "auto" || oy === "scroll") return p;
    p = p.parentElement;
  }
  return null;
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));
}

function pct(v: number): string {
  return (Math.floor(clampPct(v) * 100) / 100).toFixed(2) + "%";
}

function dayLabel(d: UptimeDay, i: number, n: number): string {
  const m = d.date ? /^(\d{4})-(\d{2})-(\d{2})/.exec(d.date) : null;
  if (m && MONTHS[Number(m[2]) - 1]) return Number(m[3]) + " " + MONTHS[Number(m[2]) - 1];
  const ago = n - 1 - i;
  return ago === 0 ? "Today" : ago === 1 ? "Yesterday" : ago + " days ago";
}

/** A deterministic, invented uptime history (mulberry32), identical on server and client. */
function seededUptime(seed: number, count = 90): UptimeDay[] {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const minor = ["Cache restores slowed", "Build queue delayed", "Dashboard errors", "Webhook retries"];
  const major = ["Remote cache unavailable", "Builds failing to start"];
  const days: UptimeDay[] = [];
  for (let i = 0; i < count; i++) {
    const r = rnd();
    if (i < count - 1 && r > 0.985) days.push({ uptime: Math.round((97.6 + rnd() * 1.3) * 100) / 100, note: major[Math.floor(rnd() * major.length)] });
    else if (i < count - 1 && r > 0.92) days.push({ uptime: Math.round((99.2 + rnd() * 0.75) * 100) / 100, note: minor[Math.floor(rnd() * minor.length)] });
    else days.push({ uptime: 100 });
  }
  return days;
}

/**
 * DEMO CONTENT for Kiln, a fictional build tool. Every name, link and figure
 * here is a placeholder, and the 90-day uptime history is invented from a
 * seed: wire status.days to your status provider (or leave the strip out)
 * before the page goes live.
 */
export const FOOTER_DEMO: {
  brand: BentoFooterGridProps["brand"];
  socials: FooterLink[];
  columns: FooterColumn[];
  status: FooterStatus & { days: UptimeDay[] };
  newsletter: { title: string };
  legal: { owner: string; year?: number; links: FooterLink[] };
} = {
  brand: { name: "Kiln", href: "#", pitch: "Builds that remember. Kiln caches every step, so your CI only does the new work." },
  socials: [
    { label: "GitHub", href: "#" },
    { label: "X", href: "#" },
    { label: "LinkedIn", href: "#" },
    { label: "YouTube", href: "#" },
  ],
  columns: [
    {
      title: "Product",
      links: [
        { label: "Builds", href: "#" },
        { label: "Branch previews", href: "#" },
        { label: "Functions", href: "#" },
        { label: "Storage", href: "#" },
        { label: "Observability", href: "#" },
      ],
    },
    {
      title: "Developers",
      links: [
        { label: "Documentation", href: "#" },
        { label: "API reference", href: "#" },
        { label: "CLI", href: "#" },
        { label: "Templates", href: "#" },
        { label: "Changelog", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#" },
        { label: "Customers", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Contact", href: "#" },
      ],
    },
  ],
  status: { label: "Operational", caption: "Uptime, last 90 days", tone: "ok", days: seededUptime(2609) },
  newsletter: { title: "The changelog, once a month. Nothing else." },
  legal: {
    owner: "Kiln Labs",
    year: 2026,
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Cookies", href: "#" },
      { label: "Security", href: "#" },
    ],
  },
};

const HAIR: CSSProperties = { background: "#0f1012", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" };
const LABEL = "text-[11px] uppercase tracking-[0.12em] text-white/50";
// Focus rings as important utilities: hosts often ship an unlayered :focus-visible
// rule (with its own radius) that would otherwise replace them. Colour is inline.
const RING = "outline-none focus-visible:![outline-style:solid] focus-visible:![outline-width:2px]";
const RING_C: CSSProperties = { outlineColor: "rgba(255,255,255,0.8)" };
const C4: Record<number, string> = {
  1: "@4xl:col-span-1",
  2: "@4xl:col-span-2",
  3: "@4xl:col-span-3",
  4: "@4xl:col-span-4",
  5: "@4xl:col-span-5",
  6: "@4xl:col-span-6",
};

type Box = { x: number; y: number; w: number; h: number };

/** Where an element sits in the grid's layout pixels, including any slide it is in the middle of. */
function pos(el: HTMLElement, grid: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (let p: HTMLElement | null = el; p && p !== grid; p = p.offsetParent as HTMLElement | null) {
    x += p.offsetLeft;
    y += p.offsetTop;
  }
  const t = getComputedStyle(el).transform;
  if (t && t !== "none") {
    const m = new DOMMatrixReadOnly(t);
    x += m.m41;
    y += m.m42;
  }
  return { x, y };
}

/** A tile with a skin is measured by its skin, which may be mid-stretch. */
function box(el: HTMLElement, grid: HTMLElement): Box {
  const p = pos(el, grid);
  const skin = el.querySelector<HTMLElement>(":scope > [data-skin]");
  if (skin) return { x: p.x + skin.offsetLeft, y: p.y + skin.offsetTop, w: skin.offsetWidth, h: skin.offsetHeight };
  return { x: p.x, y: p.y, w: el.offsetWidth, h: el.offsetHeight };
}

function Lights() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[20px] transition-opacity duration-200"
        style={{
          opacity: "var(--bfg-o, 0)",
          padding: 1,
          background: "radial-gradient(180px circle at var(--bfg-x, -999px) var(--bfg-y, -999px), rgba(255,255,255,0.7), rgba(255,255,255,0) 70%)",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[20px] transition-opacity duration-200"
        style={{
          opacity: "var(--bfg-o, 0)",
          background: "radial-gradient(260px circle at var(--bfg-x, -999px) var(--bfg-y, -999px), rgba(255,255,255,0.07), rgba(255,255,255,0) 70%)",
        }}
      />
    </>
  );
}

/** The skin of a tile that changes size: painted apart from its content so a FLIP can stretch it. */
function Skin() {
  return (
    <span data-skin aria-hidden className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-hidden rounded-[20px]" style={HAIR}>
      <Lights />
    </span>
  );
}

function StatusTile({ status }: { status: FooterStatus }) {
  const days = (status.days ?? []).slice(-90);
  const n = days.length;
  const tone = TONES[status.tone ?? "ok"];
  const [at, setAt] = useState<number | null>(null);
  const cur = at !== null && at < n ? at : null;
  const value = status.value ?? (n ? pct(days.reduce((s, d) => s + clampPct(d.uptime), 0) / n) : "");
  const read = (i: number) => {
    const d = days[i];
    return dayLabel(d, i, n) + " · " + pct(d.uptime) + (d.note ? " · " + d.note : "");
  };
  const readout = cur !== null ? read(cur) : (status.caption ?? "");

  function fromPointer(e: ReactPointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setAt(Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) / (r.width || 1)) * n))));
  }
  function onKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    const i = cur ?? n - 1;
    const to =
      e.key === "ArrowLeft" || e.key === "ArrowDown" ? i - 1
      : e.key === "ArrowRight" || e.key === "ArrowUp" ? i + 1
      : e.key === "PageUp" ? i - 7
      : e.key === "PageDown" ? i + 7
      : e.key === "Home" ? 0
      : e.key === "End" ? n - 1
      : null;
    if (to === null) return;
    e.preventDefault();
    setAt(Math.max(0, Math.min(n - 1, to)));
  }

  const labelCls = "flex min-w-0 items-center gap-2 " + LABEL;
  const labelInner = (
    <>
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: tone }} />
      <span className="truncate">{status.label}</span>
    </>
  );

  return (
    <div className="relative flex h-full flex-col justify-between gap-2 p-[14px]">
      <div className="flex items-start justify-between gap-3">
        {status.href ? (
          <a
            href={safeHref(status.href)}
            className={labelCls + " -m-1 rounded-[6px] p-1 transition-colors duration-200 hover:text-white motion-reduce:transition-none " + RING + " focus-visible:![outline-offset:0px] focus-visible:![border-radius:6px]"}
            style={{ fontFamily: MONO, ...RING_C }}
          >
            {labelInner}
            <span aria-hidden>↗</span>
          </a>
        ) : (
          <span className={labelCls} style={{ fontFamily: MONO }}>
            {labelInner}
          </span>
        )}
        {value && (
          <span className="shrink-0 text-[26px] font-bold leading-none tracking-[-0.03em]" style={{ color: tone, fontVariantNumeric: "tabular-nums" }}>
            {value}
          </span>
        )}
      </div>
      {n > 0 && (
        <div
          role="slider"
          tabIndex={0}
          aria-label={"Uptime by day, last " + n + " days"}
          aria-valuemin={1}
          aria-valuemax={n}
          aria-valuenow={(cur ?? n - 1) + 1}
          aria-valuetext={read(cur ?? n - 1)}
          onPointerMove={fromPointer}
          onPointerDown={fromPointer}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setAt(null);
          }}
          onFocus={(e) => {
            if (e.currentTarget.matches(":focus-visible")) setAt((v) => v ?? n - 1);
          }}
          onBlur={() => setAt(null)}
          onKeyDown={onKey}
          className={"relative -mx-1 flex h-7 touch-pan-y items-end gap-[2px] rounded-[6px] px-1 " + RING + " focus-visible:![outline-offset:2px] focus-visible:![border-radius:6px]"}
          style={RING_C}
        >
          {days.map((d, i) => {
            const u = clampPct(d.uptime);
            const today = i === n - 1;
            const on = cur === i;
            const h = u >= 99.995 ? 100 : u >= 99 ? 58 : 32;
            return (
              <span
                key={i}
                aria-hidden
                className={"min-w-0 flex-1 rounded-[1.5px]" + (today ? " bfg-beat" : "")}
                style={{
                  height: (on ? 100 : h) + "%",
                  background: today ? tone : "#ffffff",
                  opacity: today ? 1 : on ? 0.95 : h === 100 ? 0.16 : 0.5,
                  transition: "opacity 150ms ease-out, height 200ms " + OUT,
                }}
              />
            );
          })}
        </div>
      )}
      <div className="flex items-baseline justify-between gap-3 text-[11px] leading-tight" style={{ fontFamily: MONO }}>
        <span className="min-w-0 truncate" style={{ color: cur !== null ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)" }}>
          {readout}
        </span>
        {n > 0 && <span className="shrink-0 text-white/30">Today</span>}
      </div>
    </div>
  );
}

function Newsletter({
  data,
  tint,
  ink,
  wide,
  onWide,
}: {
  data: NonNullable<BentoFooterGridProps["newsletter"]>;
  tint: string;
  ink: string;
  wide: boolean;
  onWide: (next: boolean) => void;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "invalid" | "error">("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!EMAIL.test(v)) {
      setState("invalid");
      return;
    }
    setState("busy");
    try {
      await data.onSubscribe(v);
      setState("done");
      onWide(false);
    } catch {
      setState("error");
    }
  }

  const message =
    state === "invalid"
      ? "Enter a full email address, like name@company.com."
      : state === "error"
        ? "That didn't go through. Try again in a moment."
        : state === "done"
          ? "You're on the list. The next issue lands at the start of the month."
          : "";

  return (
    <div
      onFocus={() => onWide(true)}
      onBlur={(e) => {
        const to = e.relatedTarget as Node | null;
        if (to && e.currentTarget.contains(to)) return;
        if (!email.trim()) onWide(false);
      }}
      className={"relative flex h-full flex-col justify-center gap-3 " + (wide ? "@4xl:flex-row @4xl:items-center @4xl:justify-between @4xl:gap-10" : "")}
    >
      <p data-flip="nl-title" className={"relative text-[15px] font-semibold leading-snug text-white " + (wide ? "@4xl:max-w-[24ch]" : "")}>
        {data.title}
      </p>
      {state === "done" ? (
        <p data-flip="nl-form" className="relative flex items-center gap-2 text-[14px] text-white/80" role="status">
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
            <path d="M2.5 7.5 5.5 10.5 11.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {message}
        </p>
      ) : (
        <form data-flip="nl-form" noValidate onSubmit={submit} className={"relative flex w-full min-w-0 flex-col gap-1.5 " + (wide ? "@4xl:max-w-[520px]" : "")}>
          <div
            className="flex h-11 min-w-0 items-center rounded-[14px] bg-[#131417] p-1 transition-shadow duration-200 focus-within:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]"
            style={{ boxShadow: state === "invalid" ? "inset 0 0 0 1px rgba(255,90,90,0.7)" : undefined }}
          >
            <label htmlFor={id} className="sr-only">
              Email address
            </label>
            <input
              id={id}
              type="email"
              maxLength={254}
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state === "invalid" || state === "error") setState("idle");
              }}
              placeholder={data.placeholder ?? "you@company.com"}
              aria-invalid={state === "invalid"}
              aria-describedby={id + "-msg"}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-[14px] text-white outline-none placeholder:text-white/35 focus-visible:![outline:none]"
            />
            <button
              type="submit"
              disabled={state === "busy"}
              className={
                "h-full shrink-0 rounded-[10px] px-4 text-[13px] font-semibold transition-[filter,opacity] duration-200 hover:brightness-110 disabled:opacity-60 motion-reduce:transition-none " +
                RING +
                " focus-visible:![outline-offset:2px] focus-visible:![border-radius:10px]"
              }
              style={{ background: tint, color: ink, ...RING_C }}
            >
              {state === "busy" ? "Joining…" : (data.cta ?? "Subscribe")}
            </button>
          </div>
          <p id={id + "-msg"} role="status" className={"text-[12px] " + (state === "invalid" || state === "error" ? "text-[#ff8a8a]" : "text-white/45")}>
            {message}
          </p>
        </form>
      )}
    </div>
  );
}

export function BentoFooterGrid({
  brand,
  socials,
  columns,
  status,
  newsletter,
  legal,
  backToTop = true,
  wordmark = false,
  accent,
  scroll = "page",
  className = "",
}: BentoFooterGridProps) {
  const tint = safeHex(accent, "#ff5a1f");
  const ink = isLight(tint) ? "#0b0b0c" : "#ffffff";
  const light = useRef({ x: 0, y: 0, raf: 0 });
  const footRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const snaps = useRef(new Map<string, Box>());
  const [wide, setWide] = useState(false);
  const year = legal?.year ?? new Date().getFullYear();

  // Footprints. Three columns leave the back-to-top tile a tall 1x2 beside
  // them; four send it down beside the status. The newsletter's row is
  // [newsletter][status](top); expanded, the newsletter takes the row and the
  // rest reflow beside the legal line below, so the grid keeps its rows.
  const n = columns.length;
  const topUp = backToTop && n <= 3;
  const topRow = backToTop && n >= 4;
  const canWide = !!(newsletter && status && legal);
  const isWide = wide && canWide;
  const stW = status ? (newsletter ? (topRow ? 2 : 3) : topRow ? 5 : 6) : 0;
  const nlW = newsletter ? (status ? 3 : topRow ? 5 : 6) : 0;
  const lgW = isWide ? 6 - stW - (topRow ? 1 : 0) : 6;
  const topCls = (n % 2 ? "row-span-2 " : "col-span-2 ") + (topUp ? "@4xl:col-span-1 @4xl:row-span-2" : "@4xl:col-span-1 @4xl:row-span-1");

  useEffect(() => {
    const l = light.current;
    return () => cancelAnimationFrame(l.raf);
  }, []);

  // One light for the grid, coalesced to a write per animation frame.
  function onMove(e: ReactPointerEvent<HTMLUListElement>) {
    const grid = e.currentTarget;
    const r = grid.getBoundingClientRect();
    const k = grid.offsetWidth / (r.width || 1);
    light.current.x = (e.clientX - r.left) * k;
    light.current.y = (e.clientY - r.top) * k;
    if (light.current.raf) return;
    light.current.raf = requestAnimationFrame(() => {
      light.current.raf = 0;
      Array.from(grid.children).forEach((c) => {
        const el = c as HTMLElement;
        el.style.setProperty("--bfg-x", (light.current.x - el.offsetLeft).toFixed(1) + "px");
        el.style.setProperty("--bfg-y", (light.current.y - el.offsetTop).toFixed(1) + "px");
      });
      grid.style.setProperty("--bfg-o", "1");
    });
  }

  // ---- FLIP: the newsletter's expand and its neighbours' reflow -----------

  function expand(next: boolean) {
    const grid = gridRef.current;
    if (!canWide || next === wide || !grid) return;
    grid.querySelectorAll<HTMLElement>("[data-flip]").forEach((el) => snaps.current.set(el.getAttribute("data-flip") as string, box(el, grid)));
    setWide(next);
  }

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || snaps.current.size === 0) return;
    const reduce = reduced();
    const duration = wide ? 380 : 300;
    const easing = wide ? SPRING : OUT;
    const all = Array.from(grid.querySelectorAll<HTMLElement>("[data-flip]"));
    // Settle everything first, so every "now" is measured at rest.
    all.forEach((el) => {
      el.getAnimations().forEach((a) => a.cancel());
      el.querySelector<HTMLElement>(":scope > [data-skin]")?.getAnimations().forEach((a) => a.cancel());
    });
    all.forEach((el) => {
      const prev = snaps.current.get(el.getAttribute("data-flip") as string);
      if (!prev || reduce) return;
      const skin = el.querySelector<HTMLElement>(":scope > [data-skin]");
      const now = box(el, grid);
      if (skin) {
        // A tile that changes place or size keeps its content in flow and
        // stretches its skin from the old rectangle to the new one; its inner
        // parts slide on their own.
        if (Math.abs(prev.x - now.x) + Math.abs(prev.y - now.y) + Math.abs(prev.w - now.w) + Math.abs(prev.h - now.h) < 1) return;
        const at = pos(el, grid);
        skin.animate(
          [
            { left: prev.x - at.x + "px", top: prev.y - at.y + "px", width: prev.w + "px", height: prev.h + "px" },
            { left: "0px", top: "0px", width: now.w + "px", height: now.h + "px" },
          ],
          { duration, easing },
        );
        return;
      }
      const dx = prev.x - now.x;
      const dy = prev.y - now.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        // A tile (or a part of one) that moves: it slides from where it was, above the rest.
        el.animate(
          [
            { transform: "translate(" + dx + "px," + dy + "px)", zIndex: 2 },
            { transform: "none", zIndex: 2 },
          ],
          { duration, easing },
        );
      }
    });
    snaps.current.clear();
  }, [wide]);

  // ---- Scroll: the ring, the wordmark's crop and the heartbeat ------------
  useEffect(() => {
    const root = footRef.current;
    if (!root) return;
    const reduce = reduced();
    const sc = scroll === "self" ? scroller(root) : null;
    const ring = root.querySelector<SVGCircleElement>("[data-bfg-ring]");
    const read = root.querySelector<HTMLElement>("[data-bfg-pct]");
    const mark = root.querySelector<HTMLElement>("[data-bfg-mark]");
    let visible = false;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const top = sc ? sc.scrollTop : window.scrollY;
      const max = sc ? sc.scrollHeight - sc.clientHeight : document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 1 ? Math.max(0, Math.min(1, top / max)) : 1;
      ring?.setAttribute("stroke-dashoffset", (1 - p).toFixed(4));
      if (read) read.textContent = Math.round(p * 100) + "%";
      if (mark && mark.parentElement) {
        let q = 1;
        if (!reduce) {
          // 0 as the wordmark's tile enters the bottom of the view, 1 once all of it is in.
          const b = mark.parentElement.getBoundingClientRect();
          const bottom = sc ? sc.getBoundingClientRect().bottom : window.innerHeight;
          q = Math.max(0, Math.min(1, (bottom - b.top) / (b.height || 1)));
        }
        mark.style.transform = "translateY(" + (MARK_FROM + (MARK_TO - MARK_FROM) * q).toFixed(2) + "%)";
      }
    };
    const onScroll = () => {
      if (visible && !raf) raf = requestAnimationFrame(paint);
    };
    const io = new IntersectionObserver(
      (es) => {
        visible = es[es.length - 1].isIntersecting;
        root.toggleAttribute("data-bfg-live", visible && !reduce);
        if (visible) onScroll();
      },
      { root: sc },
    );
    io.observe(root);
    const target: HTMLElement | Window = sc ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    paint();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [scroll, wordmark, backToTop]);

  function toTop(e: ReactMouseEvent<HTMLButtonElement>) {
    const behavior: ScrollBehavior = reduced() ? "instant" : "smooth";
    const s = scroll === "self" ? scroller(e.currentTarget) : null;
    if (s) s.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
  }

  const tile = "relative overflow-hidden rounded-[20px]";

  const topTile = backToTop && (
    <li data-flip="top" className={tile + " " + topCls} style={HAIR}>
      <button
        type="button"
        onClick={toTop}
        className={
          "group absolute inset-px flex flex-col justify-between rounded-[19px] p-[15px] text-left transition-colors duration-200 hover:bg-[#16171a] motion-reduce:transition-none " +
          RING +
          " focus-visible:![outline-offset:-3px] focus-visible:![border-radius:19px]"
        }
        style={RING_C}
      >
        <span className={LABEL} style={{ fontFamily: MONO }}>
          Back to top
        </span>
        <span className="flex items-end justify-between gap-3">
          <span className="relative grid size-[52px] shrink-0 place-items-center">
            <svg aria-hidden viewBox="0 0 52 52" className="absolute inset-0 size-full -rotate-90">
              <circle cx="26" cy="26" r="24.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
              <circle data-bfg-ring cx="26" cy="26" r="24.5" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" pathLength={1} strokeDasharray="1 1" strokeDashoffset="1" />
            </svg>
            <span
              aria-hidden
              className="text-[20px] font-bold leading-none transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none"
              style={{ transitionTimingFunction: OUT }}
            >
              ↑
            </span>
          </span>
          <span data-bfg-pct aria-hidden className="text-[11px] text-white/45" style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums" }} />
        </span>
      </button>
      <Lights />
    </li>
  );

  return (
    <footer ref={footRef} className={"@container relative w-full text-white " + className} style={{ background: "#08090a" }}>
      <style>{BFG_CSS}</style>
      <div className="mx-auto max-w-[1180px] px-5 py-12 @3xl:px-12">
        <ul
          ref={gridRef}
          role="list"
          onPointerMove={onMove}
          onPointerLeave={(e) => {
            cancelAnimationFrame(light.current.raf);
            light.current.raf = 0;
            e.currentTarget.style.setProperty("--bfg-o", "0");
          }}
          className="relative grid grid-cols-2 gap-3 @4xl:grid-cols-6"
          style={{ gridAutoRows: "minmax(104px, auto)", gridAutoFlow: "dense", "--bfg-o": "0" } as CSSProperties}
        >
          {/* The brand: the one 2x2. */}
          <li className={tile + " col-span-2 row-span-2 flex flex-col justify-between p-6"} style={HAIR}>
            <Lights />
            <div className="relative">
              <a
                href={safeHref(brand.href ?? "/")}
                className={"inline-flex items-center gap-2.5 rounded-[8px] text-[17px] font-semibold " + RING + " focus-visible:![outline-offset:3px] focus-visible:![border-radius:8px]"}
                style={RING_C}
              >
                {brand.mark ?? (
                  <span aria-hidden className="grid size-7 place-items-center rounded-[8px] bg-white text-[13px] font-bold text-black">
                    {brand.name.slice(0, 1)}
                  </span>
                )}
                {brand.name}
              </a>
              {brand.pitch && <p className="mt-3 max-w-[34ch] text-[15px] leading-snug text-white/60">{brand.pitch}</p>}
            </div>
            {socials && socials.length > 0 && (
              <ul role="list" aria-label="Social" className="relative mt-6 flex flex-wrap gap-2">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a
                      href={safeHref(s.href)}
                      className={
                        "inline-flex h-8 items-center rounded-[10px] px-3 text-[12px] text-white/70 transition-colors duration-200 hover:bg-[#16171a] hover:text-white motion-reduce:transition-none " +
                        RING +
                        " focus-visible:![outline-offset:2px] focus-visible:![border-radius:10px]"
                      }
                      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)", ...RING_C }}
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>

          {/* The sitemap: a 1x2 per column. */}
          {columns.map((col) => (
            <li key={col.title} className={tile + " row-span-2 p-5"} style={HAIR}>
              <Lights />
              <nav aria-label={col.title} className="relative">
                <p className={LABEL} style={{ fontFamily: MONO }}>
                  {col.title}
                </p>
                <ul role="list" className="mt-3 space-y-1">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={safeHref(l.href)}
                        className={
                          "-mx-1.5 inline-block rounded-[8px] px-1.5 py-0.5 text-[14px] text-white/65 transition-colors duration-200 hover:text-white motion-reduce:transition-none " +
                          RING +
                          " focus-visible:![outline-offset:0px] focus-visible:![border-radius:8px]"
                        }
                        style={RING_C}
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </li>
          ))}

          {topUp && topTile}

          {/* The newsletter: expands across its row while it has focus or an address. */}
          {newsletter && (
            <li data-flip="nl" className={"relative col-span-2 rounded-[20px] p-4 @4xl:px-5 " + C4[isWide ? 6 : nlW]}>
              <Skin />
              <Newsletter data={newsletter} tint={tint} ink={ink} wide={isWide} onWide={expand} />
            </li>
          )}

          {/* Status: the figure over 90 days of bars. */}
          {status && (
            <li data-flip="status" className={tile + " col-span-2 " + C4[stW]} style={HAIR}>
              <Lights />
              <StatusTile status={status} />
            </li>
          )}

          {topRow && topTile}

          {/* The legal line: full width, or half beside the status while the newsletter is open. */}
          {legal && (
            <li data-flip="legal" className={"relative col-span-2 rounded-[20px] " + C4[lgW]}>
              <Skin />
              <div className={"relative flex h-full flex-col justify-center gap-3 p-5 " + (isWide ? "" : "@4xl:flex-row @4xl:items-center @4xl:justify-between")}>
                <p data-flip="legal-copy" className="relative text-[12px] text-white/50" style={{ fontFamily: MONO }}>
                  {"© " + year + " " + legal.owner}
                </p>
                {legal.links && legal.links.length > 0 && (
                  <ul data-flip="legal-links" role="list" className="relative flex flex-wrap gap-x-4 gap-y-1">
                    {legal.links.map((l) => (
                      <li key={l.label}>
                        <a
                          href={safeHref(l.href)}
                          className={
                            "rounded-[6px] text-[13px] text-white/60 transition-colors duration-200 hover:text-white motion-reduce:transition-none " +
                            RING +
                            " focus-visible:![outline-offset:2px] focus-visible:![border-radius:6px]"
                          }
                          style={RING_C}
                        >
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          )}

          {/* The wordmark: set huge, cropped by its tile, rising into the crop with scroll. */}
          {wordmark && (
            <li data-flip="mark" aria-hidden className={tile + " col-span-full @container"} style={HAIR}>
              <p
                data-bfg-mark
                className="select-none whitespace-nowrap px-[3cqw] font-bold leading-[0.8] tracking-[-0.06em] text-[#16171a] will-change-transform"
                style={{
                  fontSize: "min(" + Math.min(40, 150 / Math.max(3, brand.name.length)).toFixed(1) + "cqw, 420px)",
                  transform: "translateY(" + MARK_TO + "%)",
                  marginTop: "2cqw",
                }}
              >
                {brand.name}
              </p>
            </li>
          )}
        </ul>
      </div>
    </footer>
  );
}
