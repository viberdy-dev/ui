"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function PricingToggleSwitch({
  monthlyPrice = 29,
  yearlyPrice = 290,
  currency = "$",
}: {
  monthlyPrice?: number;
  yearlyPrice?: number;
  currency?: string;
}) {
  const [yearly, setYearly] = useState(false);
  const price = yearly ? yearlyPrice : monthlyPrice;
  const savePct = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100);

  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-neutral-200 p-8">
      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${!yearly ? "text-neutral-900" : "text-neutral-400"}`}>
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={yearly}
          aria-label="Bill yearly"
          onClick={() => setYearly((v) => !v)}
          className={`h-5 w-9 rounded-full transition-colors ${yearly ? "bg-red-500" : "bg-neutral-200"} relative`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              yearly ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${yearly ? "text-neutral-900" : "text-neutral-400"}`}>
          Yearly
          {savePct > 0 && (
            <span className="ml-1.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
              Save {savePct}%
            </span>
          )}
        </span>
      </div>

      <div className="relative flex h-14 items-start overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={yearly ? "yearly" : "monthly"}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
            className="flex items-start text-4xl font-black text-neutral-900"
          >
            {currency}
            {price}
            <span className="mt-2 ml-1 text-sm font-medium text-neutral-400">/{yearly ? "yr" : "mo"}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
