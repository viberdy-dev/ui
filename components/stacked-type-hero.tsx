"use client";

import { motion } from "framer-motion";

const DEFAULT_WORDS = "Type, Lettering, Sections, Components, Patterns";

export function StackedTypeHero({
  words = DEFAULT_WORDS,
  accentWord = "Sections",
  align = "left",
}: {
  /** Comma-separated. One stacked line per word. */
  words?: string;
  /** Whichever line matches gets the accent colour. */
  accentWord?: string;
  align?: "left" | "center";
}) {
  const lines = words
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

  return (
    <div
      className={
        "flex flex-col gap-1 py-10 " +
        (align === "center" ? "items-center text-center" : "items-start text-left")
      }
    >
      {lines.map((word, i) => (
        <motion.span
          key={word}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={
            "font-black leading-[0.9] tracking-tight " +
            (word === accentWord ? "text-red-500" : "text-white")
          }
          style={{ fontSize: "clamp(2rem, 8vw, 6rem)" }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
}
