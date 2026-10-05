"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Item = { id: string; label: string; group: string };

export function FlipGridReorder({
  items,
  filters,
  columns = 4,
  stiffness = 320,
  fadeExit = true,
}: {
  items: Item[];
  filters: { id: string; label: string }[];
  columns?: number;
  stiffness?: number;
  /** Fade and scale tiles as they enter and leave. Off, only layout moves. */
  fadeExit?: boolean;
}) {
  const [filter, setFilter] = useState("all");
  const visible = items.filter((i) => filter === "all" || i.group === filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={
              "rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors " +
              (filter === f.id
                ? "bg-blue-600 text-white"
                : "border border-white/20 text-white/60 hover:text-white")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(" + columns + ", minmax(0, 1fr))" }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((item) => (
            <motion.div
              /*
               * The key MUST be the item's stable id, never the array index.
               * With an index key React reuses the same DOM node for a
               * DIFFERENT item after a filter change, so Framer measures a
               * before/after box for two unrelated things — tiles appear to
               * teleport and morph instead of travelling. This one line is
               * the difference between a working FLIP grid and a broken one.
               */
              key={item.id}
              /*
               * `layout` is the whole animation: Framer records each tile's
               * box before the DOM change, reads it again after, and animates
               * the difference with a transform (FLIP). No manual measuring.
               */
              layout
              initial={fadeExit ? { opacity: 0, scale: 0.8 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={fadeExit ? { opacity: 0, scale: 0.8 } : undefined}
              transition={{
                layout: { type: "spring", stiffness, damping: 30 },
                duration: 0.18,
              }}
              className="flex aspect-square items-center justify-center rounded-md border border-white/15 bg-white/[0.05] text-white"
            >
              {item.label}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
