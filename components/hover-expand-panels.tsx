"use client";

import { useState } from "react";

type Panel = { id: string; label: string; image: string };

export function HoverExpandPanels({
  panels,
  expandRatio = 4,
  showLabels = true,
  vertical = false,
}: {
  panels: Panel[];
  expandRatio?: number;
  /** The label that resolves once a panel has room for it. */
  showLabels?: boolean;
  /** Stack the panels instead of laying them out in a row. */
  vertical?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div
      onMouseLeave={() => setActive(null)}
      className={
        "flex h-64 w-full gap-1.5 overflow-hidden rounded-lg " +
        (vertical ? "flex-col" : "flex-row")
      }
    >
      {panels.map((panel, i) => {
        const isActive = active === i;
        return (
          <button
            key={panel.id}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={panel.label}
            className="group relative min-w-0 overflow-hidden rounded-md transition-[flex-grow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              /*
               * flex-grow, not measured pixel widths. The row always sums to
               * the container no matter how many panels there are or how wide
               * it is, so nothing needs recomputing on resize and panels can
               * never drift outside the box. min-w-0 lets them compress past
               * their content's intrinsic width.
               */
              flexGrow: isActive ? expandRatio : 1,
              flexBasis: 0,
            }}
          >
            <img
              src={panel.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute left-2 top-2 font-mono text-[10px] tracking-[0.14em] text-white/70">
              {panel.id}
            </span>
            {showLabels && (
              <span
                className={
                  "absolute bottom-2 left-2 whitespace-nowrap text-sm font-bold text-white transition-all duration-300 " +
                  (isActive ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0")
                }
                style={{ transitionDelay: isActive ? "140ms" : "0ms" }}
              >
                {panel.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
