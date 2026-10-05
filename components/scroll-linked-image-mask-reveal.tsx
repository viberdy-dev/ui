"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function ScrollLinkedImageMaskReveal({ src, alt = "" }: { src: string; alt?: string }) {
  const targetRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });

  const clipPercent = useTransform(scrollYProgress, [0, 1], [0, 75]);
  const clipPath = useTransform(clipPercent, (v) => `circle(${v}% at 50% 50%)`);
  const scale = useTransform(scrollYProgress, [0, 1], [1.3, 1]);

  return (
    <div ref={targetRef} className="relative flex h-[70vh] items-center justify-center overflow-hidden">
      <motion.img src={src} alt={alt} style={{ clipPath, scale }} className="h-full w-full object-cover" />
    </div>
  );
}
