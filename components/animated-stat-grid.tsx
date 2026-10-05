"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

type Stat = { value: number; suffix: string; label: string };

const DEFAULT_STATS: Stat[] = [
  { value: 53, suffix: "+", label: "Components" },
  { value: 12000, suffix: "+", label: "Downloads" },
  { value: 98, suffix: "%", label: "Satisfaction" },
];

function StatCell({ stat, duration }: { stat: Stat; duration: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.7 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const start = performance.now();
    let raf = 0;
    function tick(now: number) {
      const t = Math.min((now - start) / 1000 / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * stat.value));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isInView, stat.value, duration]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1 rounded-xl border border-neutral-200 px-4 py-5 text-center">
      <span className="text-3xl font-black tabular-nums">
        {display.toLocaleString()}
        <span className="text-red-500">{stat.suffix}</span>
      </span>
      <span className="text-[11px] font-medium text-neutral-500">{stat.label}</span>
    </div>
  );
}

export function AnimatedStatGrid({ stats = DEFAULT_STATS, duration = 1.5 }: { stats?: Stat[]; duration?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat, i) => (
        <StatCell key={stat.label + i} stat={stat} duration={duration} />
      ))}
    </div>
  );
}
