"use client";

import { useSyncExternalStore } from "react";

/**
 * HoursPoster — opening hours set like a poster, not a table.
 *
 * Seven fixed-height rows. The day hangs off the left edge in heavy two-letter
 * caps, the hours sit in tabular monospace so the column holds, and a closed
 * day is struck through the ENTIRE row, so the negative space says closed
 * before the word does. Today is the one place the accent appears: a full
 * band behind that row. The status line ("Open now · closes 18:00") is
 * computed on the shop's clock, not the visitor's.
 *
 * NEVER RENDER THE TIME ON THE SERVER. A static page is built once and served
 * for hours, so a server-rendered "today" is both wrong and a hydration
 * mismatch. The clock is a useSyncExternalStore whose server snapshot is 0:
 * before hydration no row is today and the status shows an ellipsis; after
 * it, the store ticks at minute boundaries (and immediately when the tab
 * comes back, since background tabs throttle timers).
 *
 * Days are indexed Monday = 0 … Sunday = 6. A day with no ranges is closed. A
 * range that closes at or before it opens runs overnight. Needs Tailwind v4
 * (container queries are built in).
 */

export type DayHours = {
  /** Open/close pairs as "HH:MM", 24-hour. None or empty = closed. */
  ranges?: [string, string][];
  /** "Walk-ins", "By appointment", "Kitchen till 21:30". */
  note?: string;
};

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEK = 7 * 1440;
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

/* A minute-resolution clock shared by every instance on the page. */
let minuteNow = 0;
function subscribeMinute(onChange: () => void) {
  let timer = 0;
  const tick = () => {
    minuteNow = Math.floor(Date.now() / 60000);
    onChange();
    window.clearTimeout(timer);
    // Aim just past the boundary; a timer that fires early reads the old minute.
    timer = window.setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") tick();
  };
  tick();
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
const readMinute = () => minuteNow;
const readMinuteServer = () => 0;

/** Weekday (Mon = 0) and minute of day on the shop's wall clock; null for a bad zone. */
function zoneNow(ms: number, timeZone: string): { day: number; minute: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(ms));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
    if (day < 0) return null;
    return { day, minute: Number(get("hour")) * 60 + Number(get("minute")) };
  } catch {
    return null;
  }
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function fmt(min: number, hour12: boolean) {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  if (!hour12) return String(h).padStart(2, "0") + ":" + mm;
  return (h % 12 || 12) + (m % 60 ? ":" + mm : "") + (h < 12 ? "am" : "pm");
}

function status(days: DayHours[], now: { day: number; minute: number }, hour12: boolean) {
  const spans: { s: number; e: number }[] = [];
  days.forEach((d, i) =>
    (d.ranges ?? []).forEach(([o, c]) => {
      const s = i * 1440 + toMinutes(o);
      let e = i * 1440 + toMinutes(c);
      if (e <= s) e += 1440; // overnight
      spans.push({ s, e });
    }),
  );
  const t = now.day * 1440 + now.minute;
  for (const sp of spans) {
    // A Sunday-night span that runs into Monday holds Monday's early minutes at t + WEEK.
    if ((t >= sp.s && t < sp.e) || (t + WEEK >= sp.s && t + WEEK < sp.e)) {
      return { open: true, text: "Open now · closes " + fmt(sp.e, hour12) };
    }
  }
  if (spans.length === 0) return { open: false, text: "By appointment" };
  let wait = Infinity;
  let at = 0;
  for (const sp of spans) {
    const d = (((sp.s - t) % WEEK) + WEEK) % WEEK;
    if (d < wait) {
      wait = d;
      at = sp.s;
    }
  }
  const day = Math.floor(at / 1440) % 7;
  const when =
    day === now.day && wait < 1440 ? "today" : day === (now.day + 1) % 7 && wait < 2880 ? "tomorrow" : DAY_NAMES[day];
  return { open: false, text: "Closed · opens " + when + " " + fmt(at, hour12) };
}

export function HoursPoster({
  days,
  timeZone = "Europe/London",
  title = "Opening hours",
  phone,
  note,
  accent = "#c8452c",
  paper = "#f4f2ee",
  ink = "#111111",
  hour12 = false,
  today,
  className = "",
}: {
  /** Seven entries, Monday first. */
  days: DayHours[];
  /** IANA zone the shop lives in. */
  timeZone?: string;
  title?: string;
  /** Rendered as a tel: link. */
  phone?: string;
  /** Small print under the rows. */
  note?: string;
  /** The band behind today. Hex only. */
  accent?: string;
  paper?: string;
  ink?: string;
  hour12?: boolean;
  /** Force which row is today (0 = Monday) — for screenshots and tests. */
  today?: number;
  className?: string;
}) {
  const minute = useSyncExternalStore(subscribeMinute, readMinute, readMinuteServer);
  const now = minute ? zoneNow(minute * 60000, timeZone) : null;
  const todayIndex = today ?? now?.day ?? -1;
  const st = now ? status(days, now, hour12) : null;

  const acc = hex(accent, "#c8452c");
  const pa = hex(paper, "#f4f2ee");
  const ik = hex(ink, "#111111");
  const line = rgba(ik, 0.14);

  return (
    <section
      className={"@container relative flex h-full flex-col overflow-hidden font-sans " + className}
      style={{ background: pa, color: ik }}
    >
      <div className="flex items-start justify-between gap-6 px-6 pt-6 @3xl:px-12 @3xl:pt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em]">{title}</h2>
        <p className="text-right font-mono text-[11px] uppercase tracking-[0.18em]" aria-live="polite">
          {st ? (
            <>
              <span
                aria-hidden="true"
                className="mr-2 inline-block size-1.5 rounded-full align-middle"
                style={{ background: st.open ? acc : ik, opacity: st.open ? 1 : 0.35 }}
              />
              {st.text}
            </>
          ) : (
            <span aria-hidden="true">…</span>
          )}
        </p>
      </div>

      <ol className="mt-5 list-none @3xl:mt-7">
        {DAYS.map((d, i) => {
          const day = days[i] ?? {};
          const ranges = day.ranges ?? [];
          const closed = ranges.length === 0;
          const isToday = i === todayIndex;
          const fg = isToday ? pa : ik;
          return (
            <li
              key={d}
              aria-current={isToday ? "date" : undefined}
              className="relative flex h-16 items-center border-t @3xl:h-[72px]"
              style={{
                borderColor: isToday ? "transparent" : line,
                background: isToday ? acc : "transparent",
                color: fg,
              }}
            >
              <span className="sr-only">{DAY_NAMES[i]}: </span>
              {/* The day hangs off the left edge on purpose. */}
              <span
                aria-hidden="true"
                className="w-[34%] shrink-0 text-[52px] leading-none font-black tracking-[-0.06em] uppercase select-none @3xl:w-[40%] @3xl:text-[66px]"
                style={{ marginLeft: "-0.09em" }}
              >
                {d}
              </span>
              <span className="font-mono text-[14px] tracking-[0.02em] tabular-nums @3xl:text-[16px]">
                {closed
                  ? "Closed"
                  : ranges.map(([o, c]) => fmt(toMinutes(o), hour12) + " – " + fmt(toMinutes(c), hour12)).join("  ·  ")}
              </span>
              {day.note && (
                <span className="ml-auto hidden pr-6 font-mono text-[11px] uppercase tracking-[0.14em] opacity-60 @3xl:block @3xl:pr-12">
                  {day.note}
                </span>
              )}
              {closed && (
                <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-[2px]" style={{ background: fg }} />
              )}
            </li>
          );
        })}
      </ol>

      <div
        className="mt-auto flex items-end justify-between gap-6 border-t px-6 py-5 font-mono text-[11px] uppercase tracking-[0.14em] @3xl:px-12"
        style={{ borderColor: line }}
      >
        <span className="opacity-60">{note}</span>
        {phone && (
          <a href={"tel:" + phone.replace(/[^+\d]/g, "")} className="underline-offset-4 hover:underline">
            {phone}
          </a>
        )}
      </div>
    </section>
  );
}
