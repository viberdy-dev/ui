"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

type Testimonial = { quote: string; name: string; role: string };

export function TestimonialCarousel({
  testimonials,
  autoAdvance = true,
  interval = 3200,
}: {
  testimonials: Testimonial[];
  autoAdvance?: boolean;
  interval?: number;
}) {
  const [[index, direction], setIndex] = useState<[number, number]>([0, 0]);

  function go(delta: number) {
    setIndex(([i]) => [(i + delta + testimonials.length) % testimonials.length, delta]);
  }

  useEffect(() => {
    if (!autoAdvance) return;
    const id = setInterval(() => go(1), interval);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvance, interval]);

  const current = testimonials[index];

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-200 px-6 py-8">
      <Quote size={22} className="mb-3 text-red-500" />
      <div className="relative h-24">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={index}
            initial={{ x: direction >= 0 ? 40 : -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction >= 0 ? -40 : 40, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <p className="text-base font-bold leading-snug">“{current.quote}”</p>
            <p className="mt-3 text-xs text-neutral-500">
              {current.name} · {current.role}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {testimonials.map((_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-red-500" : "bg-neutral-200"}`} />
          ))}
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => go(-1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 hover:text-red-500">
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => go(1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 hover:text-red-500">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
