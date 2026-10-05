"use client";

import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";

type Faq = { q: string; a: string };

export function SearchableFaqAccordion({ faqs }: { faqs: Faq[] }) {
  const baseId = useId();
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const filtered = useMemo(
    () =>
      faqs
        .map((f, i) => ({ ...f, id: i }))
        .filter(
          (f) => f.q.toLowerCase().includes(query.toLowerCase()) || f.a.toLowerCase().includes(query.toLowerCase()),
        ),
    [faqs, query],
  );

  function toggle(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-3 flex items-center gap-2 rounded-full border border-neutral-200 px-3.5 py-2">
        <Search size={13} className="text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search FAQs..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
        />
      </div>

      <div className="flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200">
        {filtered.length === 0 ? (
          <p className="px-4 py-4 text-sm text-neutral-400">No matches.</p>
        ) : (
          filtered.map((f) => {
            const panelId = `${baseId}-panel-${f.id}`;
            const triggerId = `${baseId}-trigger-${f.id}`;
            return (
              <div key={f.id}>
                <button
                  id={triggerId}
                  aria-expanded={openIds.has(f.id)}
                  aria-controls={panelId}
                  onClick={() => toggle(f.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
                >
                  {f.q}
                  <motion.span animate={{ rotate: openIds.has(f.id) ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={14} className="text-neutral-400" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {openIds.has(f.id) && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={triggerId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-3 text-sm text-neutral-500">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
