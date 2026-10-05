"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

type Step = { title: string; body: string };

const DEFAULT_STEPS: Step[] = [
  { title: "Idea", body: "Sketch the vibe, pick a direction." },
  { title: "Build", body: "Ship real components, not mockups." },
  { title: "Launch", body: "Ready for production from day one." },
];

function TimelineItem({ step, index }: { step: Step; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });

  return (
    <div ref={ref} className="relative flex gap-4 pb-8 last:pb-0">
      <div className="relative flex w-6 shrink-0 flex-col items-center">
        <motion.span
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ duration: 0.3, delay: index * 0.15, ease: [0.65, 0, 0.35, 1] }}
          className="z-10 mt-1 h-3 w-3 shrink-0 rounded-full bg-red-500"
        />
        <span className="absolute top-4 bottom-0 w-px bg-neutral-200" />
      </div>
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.4, delay: index * 0.15 + 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl border border-neutral-200 px-4 py-3"
      >
        <p className="text-sm font-bold">{step.title}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{step.body}</p>
      </motion.div>
    </div>
  );
}

export function VerticalTimelineReveal({ steps = DEFAULT_STEPS }: { steps?: Step[] }) {
  return (
    <div className="w-full max-w-sm">
      {steps.map((step, i) => (
        <TimelineItem key={step.title + i} step={step} index={i} />
      ))}
    </div>
  );
}
