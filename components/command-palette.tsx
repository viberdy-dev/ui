"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";

const DEFAULT_ITEMS = [
  "Create new component",
  "Search the library",
  "Copy install command",
  "Toggle dark mode",
  "Open AI prompt",
];

export function CommandPalette({
  items = DEFAULT_ITEMS,
  placeholder = "Type a command...",
}: {
  items?: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => items.filter((item) => item.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-full border border-neutral-200 px-4 py-2.5 text-sm text-neutral-500 hover:border-red-500 hover:text-red-500"
      >
        <Search size={15} />
        Search commands
        <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-1/2 top-24 z-50 w-full max-w-md -translate-x-1/2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl"
            >
              <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2.5">
                <Search size={14} className="shrink-0 text-neutral-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                />
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {results.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-neutral-400">No commands match.</p>
                ) : (
                  results.map((item) => (
                    <button
                      key={item}
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                    >
                      {item}
                      <ArrowRight size={12} className="text-neutral-400" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
