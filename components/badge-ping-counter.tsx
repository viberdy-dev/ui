"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";

export function BadgePingCounter({ initialCount = 0 }: { initialCount?: number }) {
  const [count, setCount] = useState(initialCount);

  return (
    <button
      onClick={() => setCount((c) => c + 1)}
      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 text-neutral-500"
    >
      <Bell size={17} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={count}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="text-[10px] font-bold text-white"
            >
              {count}
            </motion.span>
          </AnimatePresence>
          <motion.span
            key={`ring-${count}`}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 rounded-full bg-red-500"
          />
        </span>
      )}
    </button>
  );
}
