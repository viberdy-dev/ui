"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

export function OdometerCounter({
  target = 12400,
  duration = 1.6,
  prefix = "",
  suffix = "+",
}: {
  target?: number;
  duration?: number;
  /** Printed before the number, unstyled. */
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.8 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const start = performance.now();
    let raf = 0;

    function tick(now: number) {
      const elapsed = (now - start) / 1000;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isInView, target, duration]);

  return (
    <span ref={ref} className="text-4xl font-black tabular-nums">
      {prefix}
      {value.toLocaleString()}
      <span className="text-red-500">{suffix}</span>
    </span>
  );
}
