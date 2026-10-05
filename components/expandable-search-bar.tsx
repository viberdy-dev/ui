"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";

export function ExpandableSearchBar({
  placeholder = "Search...",
  width = 240,
}: {
  placeholder?: string;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleOpen() {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="flex h-11 items-center gap-2 rounded-full border border-neutral-200 px-3"
      style={{ width: open ? width : 44 }}
    >
      {open ? (
        <>
          <Search size={16} className="shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
          <button aria-label="Close search" onClick={() => setOpen(false)} className="shrink-0 text-neutral-400">
            <X size={16} />
          </button>
        </>
      ) : (
        <button aria-label="Open search" onClick={handleOpen} className="flex h-full w-full items-center justify-center text-neutral-400">
          <Search size={16} />
        </button>
      )}
    </motion.div>
  );
}
