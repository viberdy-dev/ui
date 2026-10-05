"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export function AnimatedTabs({
  tabs = ["Overview", "Pricing", "Reviews"],
  shape = "pill",
}: {
  tabs?: string[];
  shape?: "pill" | "rounded";
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="inline-flex gap-1 rounded-full border border-neutral-200 bg-neutral-100 p-1">
      {tabs.map((tab, i) => (
        <button
          key={tab}
          onClick={() => setActive(i)}
          className={`relative px-4 py-1.5 text-sm font-semibold transition-colors ${
            active === i ? "text-white" : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          {active === i && (
            <motion.span
              layoutId="tab-indicator"
              className={`absolute inset-0 bg-red-500 ${shape === "pill" ? "rounded-full" : "rounded-md"}`}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative">{tab}</span>
        </button>
      ))}
    </div>
  );
}
