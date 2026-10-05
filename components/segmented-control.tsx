"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

export function SegmentedControl({
  options = ["Day", "Week", "Month"],
  defaultIndex = 0,
  onChange,
}: {
  options?: string[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
}) {
  const [active, setActive] = useState(defaultIndex);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function focusAndActivate(i: number) {
    const next = (i + options.length) % options.length;
    setActive(next);
    onChange?.(next);
    buttonRefs.current[next]?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent, i: number) {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusAndActivate(i + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusAndActivate(i - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAndActivate(0);
        break;
      case "End":
        e.preventDefault();
        focusAndActivate(options.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div role="tablist" className="inline-flex gap-0.5 rounded-full border border-neutral-200 bg-neutral-50 p-1">
      {options.map((option, i) => (
        <button
          key={option}
          ref={(el) => {
            buttonRefs.current[i] = el;
          }}
          role="tab"
          aria-selected={active === i}
          tabIndex={active === i ? 0 : -1}
          onClick={() => {
            setActive(i);
            onChange?.(i);
          }}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className="relative rounded-full px-4 py-1.5 text-sm font-medium"
        >
          {active === i && (
            <motion.div
              layoutId="segmented-highlight"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="absolute inset-0 rounded-full bg-red-500"
            />
          )}
          <span className={`relative z-10 ${active === i ? "text-white" : "text-neutral-500"}`}>
            {option}
          </span>
        </button>
      ))}
    </div>
  );
}
