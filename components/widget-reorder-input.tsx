"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";

/**
 * WidgetReorderInput — the "customise your dashboard" panel, in the bento
 * kit's utility register.
 *
 * A list of widgets on shared hairlines: drag a row by its grip, or do it
 * all from the keyboard (Space picks a row up, the arrow keys move it, Space
 * drops it and Escape puts it back; Alt with an arrow moves it in one step).
 * A switch shows or hides each widget. Beside the list, a miniature of the
 * dashboard redraws as you go, each tile gliding to its new place, so the
 * result is visible before it is saved. Save hands the new layout to
 * `onSave`; Cancel returns to the last save and Reset to the defaults.
 * Every move is announced to screen readers.
 *
 * Needs Tailwind v4 (container queries are built in). No dependencies beyond
 * React.
 */

export type DashWidget = {
  id: string;
  name: string;
  /** Footprint on the dashboard: columns x rows. */
  size: "1x1" | "2x1" | "1x2" | "2x2";
  visible: boolean;
};

export type WidgetReorderInputProps = {
  title?: string;
  /** The saved layout, in order. */
  widgets: DashWidget[];
  /** What Reset returns to. Defaults to `widgets`. */
  defaults?: DashWidget[];
  /** Store the layout. Resolve when it is stored; throw to show the error. */
  onSave?: (widgets: DashWidget[]) => Promise<void> | void;
  accent?: string;
  className?: string;
};

const MONO = "var(--font-mono, var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace))";
const OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
/** The kit's reorder spring, shared with the rest of the Bento kit. */
const SPRING = "cubic-bezier(0.34, 1.25, 0.64, 1)";
const SPAN: Record<DashWidget["size"], string> = {
  "1x1": "",
  "2x1": "col-span-2",
  "1x2": "row-span-2",
  "2x2": "col-span-2 row-span-2",
};

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

function move<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Remember where each child sat, then glide the ones that moved. */
function useFlip(ref: RefObject<HTMLElement | null>, key: string, skip?: string | null) {
  const last = useRef(new Map<string, { x: number; y: number }>());
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const next = new Map<string, { x: number; y: number }>();
    const runs: Animation[] = [];
    const still = reduced();
    root.querySelectorAll<HTMLElement>("[data-flip]").forEach((el) => {
      const id = el.dataset.flip as string;
      const pos = { x: el.offsetLeft, y: el.offsetTop };
      next.set(id, pos);
      const prev = last.current.get(id);
      if (still || id === skip) return;
      if (!prev) {
        if (last.current.size) runs.push(el.animate([{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: OUT }));
        return;
      }
      const dx = prev.x - pos.x;
      const dy = prev.y - pos.y;
      if (dx || dy) runs.push(el.animate([{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "none" }], { duration: 380, easing: SPRING }));
    });
    last.current = next;
    return () => runs.forEach((a) => a.finish());
  }, [ref, key, skip]);
}

export function WidgetReorderInput({ title = "Customise dashboard", widgets, defaults, onSave, accent, className = "" }: WidgetReorderInputProps) {
  const uid = useId();
  const tint = safeHex(accent, "#ff5a1f");
  const ink = isLight(tint) ? "#0b0b0c" : "#ffffff";

  const [saved, setSaved] = useState(widgets);
  const [draft, setDraft] = useState(widgets);
  const [grabbed, setGrabbed] = useState<{ id: string; from: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const listRef = useRef<HTMLUListElement>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const refocus = useRef<string | null>(null);
  const drag = useRef({ id: "", pointer: 0, startY: 0, grab: 0, pitch: 49, active: false, lastY: 0 });
  const saveRun = useRef(0);

  const order = draft.map((w) => w.id + (w.visible ? "" : "~")).join(",");
  useFlip(listRef, order, dragging);
  useFlip(miniRef, order);

  // After a keyboard move React may have moved the row's node: focus it again.
  useLayoutEffect(() => {
    const id = refocus.current;
    if (!id) return;
    refocus.current = null;
    listRef.current?.querySelector<HTMLElement>('[data-grip="' + CSS.escape(id) + '"]')?.focus();
  }, [order]);

  // While dragging, keep the row under the pointer across re-orders.
  useLayoutEffect(() => {
    const d = drag.current;
    if (!dragging || !d.active) return;
    const row = listRef.current?.querySelector<HTMLElement>('[data-flip="' + CSS.escape(d.id) + '"]');
    if (row) row.style.transform = "translateY(" + (d.lastY - d.grab - row.offsetTop) + "px)";
  });

  useEffect(() => {
    if (saveState !== "done") return;
    const t = window.setTimeout(() => setSaveState("idle"), 1400);
    return () => window.clearTimeout(t);
  }, [saveState]);

  // Changes as a person counts them: rows moved (all rows minus the longest
  // run still in saved order, so one drag is one change) plus rows switched.
  const savedAt = new Map(saved.map((s, i) => [s.id, i]));
  const seq = draft.map((w) => savedAt.get(w.id) ?? -1).filter((i) => i >= 0);
  const run: number[] = [];
  seq.forEach((v, i) => {
    run[i] = 1;
    for (let j = 0; j < i; j++) if (seq[j] < v && run[j] + 1 > run[i]) run[i] = run[j] + 1;
  });
  const moved = seq.length - (run.length ? Math.max(...run) : 0);
  const switched = draft.filter((w) => {
    const j = savedAt.get(w.id);
    return j === undefined || saved[j].visible !== w.visible;
  }).length;
  const changes = moved + switched;
  const dirty = changes > 0;

  function announce(text: string) {
    setSaid(text);
  }
  function posText(i: number) {
    return "position " + (i + 1) + " of " + draft.length;
  }

  // ---- Keyboard -----------------------------------------------------------
  function onGripKey(e: ReactKeyboardEvent, w: DashWidget, i: number) {
    const up = e.key === "ArrowUp";
    const down = e.key === "ArrowDown";
    if ((up || down) && (e.altKey || grabbed?.id === w.id)) {
      e.preventDefault();
      const to = Math.max(0, Math.min(draft.length - 1, i + (up ? -1 : 1)));
      if (to === i) return;
      refocus.current = w.id;
      setDraft(move(draft, i, to));
      announce(w.name + ", moved to " + posText(to) + ".");
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (grabbed?.id === w.id) {
        setGrabbed(null);
        announce(w.name + ", dropped at " + posText(i) + ".");
      } else {
        setGrabbed({ id: w.id, from: i });
        announce(w.name + ", picked up at " + posText(i) + ". Use the arrow keys to move, Space to drop, Escape to cancel.");
      }
      return;
    }
    if (e.key === "Escape" && grabbed?.id === w.id) {
      e.preventDefault();
      refocus.current = w.id;
      setDraft(move(draft, i, grabbed.from));
      setGrabbed(null);
      announce(w.name + ", move cancelled. Back at " + posText(grabbed.from) + ".");
    }
  }

  // ---- Pointer ------------------------------------------------------------
  function local(clientY: number) {
    const list = listRef.current as HTMLUListElement;
    const r = list.getBoundingClientRect();
    return (clientY - r.top) * (list.offsetHeight / (r.height || 1));
  }
  function rowOf(id: string) {
    return listRef.current?.querySelector<HTMLElement>('[data-flip="' + CSS.escape(id) + '"]') ?? null;
  }
  function place(y: number) {
    const d = drag.current;
    const row = rowOf(d.id);
    if (!row) return;
    row.style.transform = "translateY(" + (y - d.grab - row.offsetTop) + "px)";
  }
  function onGripDown(e: ReactPointerEvent, w: DashWidget) {
    if (e.button !== 0 || !listRef.current) return;
    const row = rowOf(w.id);
    if (!row) return;
    const rows = listRef.current.querySelectorAll<HTMLElement>("[data-flip]");
    const y = local(e.clientY);
    drag.current = {
      id: w.id,
      pointer: e.pointerId,
      startY: y,
      grab: y - row.offsetTop,
      pitch: rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : row.offsetHeight,
      active: false,
      lastY: y,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointers cannot be captured.
    }
  }
  function onGripMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d.id || e.pointerId !== d.pointer) return;
    const y = local(e.clientY);
    d.lastY = y;
    if (!d.active) {
      if (Math.abs(y - d.startY) < 6) return;
      d.active = true;
      setDragging(d.id);
      setGrabbed(null);
    }
    const from = draft.findIndex((w) => w.id === d.id);
    const to = Math.max(0, Math.min(draft.length - 1, Math.round((y - d.grab) / d.pitch)));
    if (from !== -1 && to !== from) setDraft(move(draft, from, to));
    place(y);
  }
  function onGripUp(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d.id || e.pointerId !== d.pointer) return;
    const row = rowOf(d.id);
    const wasActive = d.active;
    const id = d.id;
    drag.current = { ...d, id: "", active: false };
    if (!wasActive) return;
    if (row) {
      const from = row.style.transform;
      row.style.transform = "";
      if (from && !reduced()) row.animate([{ transform: from }, { transform: "none" }], { duration: 320, easing: SPRING });
    }
    setDragging(null);
    const i = draft.findIndex((w) => w.id === id);
    const w = draft[i];
    if (w) announce(w.name + ", dropped at " + posText(i) + ".");
  }

  // ---- Actions ------------------------------------------------------------
  function toggle(id: string) {
    const w = draft.find((x) => x.id === id);
    setDraft(draft.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)));
    if (w) announce(w.name + (w.visible ? " hidden." : " shown."));
  }
  async function save() {
    if (!dirty || saveState === "busy") return;
    const run = ++saveRun.current;
    const sent = draft;
    setSaveState("busy");
    try {
      if (onSave) await onSave(sent);
      if (run !== saveRun.current) return;
      setSaved(sent);
      setSaveState("done");
      announce("Layout saved.");
    } catch {
      if (run !== saveRun.current) return;
      setSaveState("error");
      announce("The layout was not saved. Try again.");
    }
  }

  const hint = uid + "-hint";
  const btn =
    "inline-flex h-9 items-center justify-center rounded-[10px] px-3.5 text-[13px] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-40 motion-reduce:transition-none";

  return (
    <section
      aria-labelledby={uid + "-title"}
      className={"@container relative w-full rounded-[20px] bg-[#0f1012] text-white " + className}
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between gap-4 px-5 pt-5">
        <div>
          <h2 id={uid + "-title"} className="text-[17px] font-semibold tracking-[-0.01em]">
            {title}
          </h2>
          <p className="mt-1 text-[13px] text-white/50">Drag to reorder, or use the keyboard. Switch widgets on and off.</p>
        </div>
        <p className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-white/50" style={{ fontFamily: MONO }}>
          {dirty ? changes + (changes === 1 ? " change" : " changes") : "Saved"}
        </p>
      </div>
      <p id={hint} className="sr-only">
        Press Space to pick up, the arrow keys to move, Space to drop and Escape to cancel. Alt and an arrow key moves it in one step.
      </p>
      <p className="sr-only" aria-live="polite" role="status">
        {said}
      </p>

      <div className="grid gap-5 p-5 @3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* The list, on shared hairlines. */}
        <div className="relative isolate rounded-[14px]">
          <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-[14px] bg-white/[0.08]" />
          <ul ref={listRef} role="list" className="relative m-px flex flex-col gap-px overflow-hidden rounded-[13px]">
            {draft.map((w, i) => {
              const held = grabbed?.id === w.id || dragging === w.id;
              return (
                <li
                  key={w.id}
                  data-flip={w.id}
                  className={"relative flex h-12 items-center gap-3 pr-3 transition-colors duration-150 " + (held ? "z-10 bg-[#1b1c20]" : "bg-[#131417]")}
                  style={held ? { boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)" } : undefined}
                >
                  <button
                    type="button"
                    data-grip={w.id}
                    aria-label={"Move " + w.name}
                    aria-describedby={hint}
                    aria-pressed={grabbed?.id === w.id}
                    onKeyDown={(e) => onGripKey(e, w, i)}
                    onBlur={() => {
                      if (grabbed?.id === w.id && refocus.current !== w.id) {
                        setGrabbed(null);
                        announce(w.name + ", dropped at " + posText(i) + ".");
                      }
                    }}
                    onPointerDown={(e) => onGripDown(e, w)}
                    onPointerMove={onGripMove}
                    onPointerUp={onGripUp}
                    onPointerCancel={onGripUp}
                    className={
                      "grid h-full w-10 shrink-0 touch-none place-items-center text-white/40 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80 " +
                      (dragging === w.id ? "cursor-grabbing" : "cursor-grab")
                    }
                  >
                    <svg aria-hidden width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                      <circle cx="2.5" cy="2.5" r="1.3" />
                      <circle cx="7.5" cy="2.5" r="1.3" />
                      <circle cx="2.5" cy="7" r="1.3" />
                      <circle cx="7.5" cy="7" r="1.3" />
                      <circle cx="2.5" cy="11.5" r="1.3" />
                      <circle cx="7.5" cy="11.5" r="1.3" />
                    </svg>
                  </button>
                  <span className={"min-w-0 flex-1 truncate text-[14px] " + (w.visible ? "text-white" : "text-white/40")}>{w.name}</span>
                  <span className="shrink-0 text-[11px] text-white/40" style={{ fontFamily: MONO }}>
                    {w.size}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={w.visible}
                    aria-label={"Show " + w.name}
                    onClick={() => toggle(w.id)}
                    className={
                      "relative h-5 w-9 shrink-0 rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131417] motion-reduce:transition-none " +
                      (w.visible ? "bg-white/90" : "bg-[#26272b]")
                    }
                  >
                    <span
                      aria-hidden
                      className={"absolute top-0.5 left-0.5 size-4 rounded-full transition-transform duration-200 motion-reduce:transition-none " + (w.visible ? "bg-[#0f1012]" : "bg-white/60")}
                      style={{ transform: w.visible ? "translateX(16px)" : "none", transitionTimingFunction: OUT }}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* The miniature: the dashboard as it will be. A screen inside the
            tile, so it drops back to the canvas colour on purpose. */}
        <div aria-hidden className="rounded-[14px] bg-[#08090a] p-3" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
          <p className="mb-2.5 text-[11px] uppercase tracking-[0.12em] text-white/40" style={{ fontFamily: MONO }}>
            Preview
          </p>
          <div ref={miniRef} className="grid grid-cols-4 gap-1.5" style={{ gridAutoRows: "56px", gridAutoFlow: "dense" }}>
            {draft
              .filter((w) => w.visible)
              .map((w) => (
                <div
                  key={w.id}
                  data-flip={w.id}
                  className={"flex items-end overflow-hidden rounded-[10px] bg-[#16171a] p-1.5 " + SPAN[w.size]}
                  style={{
                    boxShadow: "inset 0 0 0 1px " + (dragging === w.id || grabbed?.id === w.id ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.08)"),
                  }}
                >
                  <span className="truncate text-[10px] leading-none text-white/55" style={{ fontFamily: MONO }}>
                    {w.name}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
        <button
          type="button"
          disabled={saveState === "busy"}
          onClick={() => {
            setDraft(defaults ?? widgets);
            announce("Defaults restored. Save to keep them.");
          }}
          className={btn + " -ml-2 text-white/55 hover:text-white"}
        >
          Reset to defaults
        </button>
        <div className="flex items-center gap-2">
          {saveState === "error" && <span className="text-[12px] text-[#ff8a8a]">Not saved. Try again.</span>}
          <button
            type="button"
            disabled={!dirty || saveState === "busy"}
            onClick={() => {
              setDraft(saved);
              announce("Changes discarded.");
            }}
            className={btn + " text-white/70 hover:bg-[#16171a] hover:text-white"}
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!dirty || saveState === "busy"}
            onClick={save}
            className={btn + " min-w-[88px] font-semibold hover:brightness-110"}
            style={{ background: dirty || saveState === "done" ? tint : "#26272b", color: dirty || saveState === "done" ? ink : "rgba(255,255,255,0.6)" } as CSSProperties}
          >
            {saveState === "busy" ? "Saving…" : saveState === "done" ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </section>
  );
}
