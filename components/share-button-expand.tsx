"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Share2, X, Mail, Link2, Check } from "lucide-react";

const OPTIONS = [
  { key: "x", icon: X, label: "Share on X" },
  { key: "email", icon: Mail, label: "Share via email" },
  { key: "copy", icon: Link2, label: "Copy link" },
];

export function ShareButtonExpand({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleOptionClick(key: string) {
    if (key === "copy") {
      navigator.clipboard?.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
      return;
    }
    setOpen(false);
  }

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="inline-flex items-center gap-1 overflow-hidden rounded-full border border-neutral-200 p-1.5"
    >
      <button
        aria-label={open ? "Close share options" : "Share"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:text-red-500"
      >
        <Share2 size={15} />
      </button>
      <AnimatePresence initial={false}>
        {open &&
          OPTIONS.map(({ key, icon: Icon, label }, i) => (
            <motion.button
              key={key}
              layout
              aria-label={key === "copy" && copied ? "Link copied" : label}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15, delay: i * 0.04 }}
              onClick={() => handleOptionClick(key)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:text-red-500"
            >
              {key === "copy" && copied ? <Check size={14} className="text-red-500" /> : <Icon size={14} />}
            </motion.button>
          ))}
      </AnimatePresence>
    </motion.div>
  );
}
