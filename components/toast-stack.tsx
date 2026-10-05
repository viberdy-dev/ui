"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Toast = { id: number; message: string };
let toastId = 0;

export function useToasts({
  duration = 2200,
  position = "bottom",
}: {
  /** ms before a toast auto-dismisses. */
  duration?: number;
  /** Which edge the stack grows from. */
  position?: "bottom" | "top";
} = {}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function pushToast(message: string) {
    const id = toastId++;
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }

  const ToastStack = () => (
    <div
      className={
        "pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 " +
        (position === "bottom" ? "bottom-4" : "top-4")
      }
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: position === "bottom" ? 16 : -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white shadow-lg"
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return { pushToast, ToastStack };
}
