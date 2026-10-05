"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export function usePageLoadingBar() {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const rafRef = useRef<number | null>(null);

  function start() {
    setLoading(true);
    setProgress(3);
  }

  useEffect(() => {
    if (!loading) return;
    function tick() {
      setProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.03));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loading]);

  function finish() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setProgress(100);
    setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 300);
  }

  return { progress, loading, start, finish };
}

export function PageLoadingBar({ progress, loading, color = "#ff2d2d" }: { progress: number; loading: boolean; color?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading progress"
      className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent"
    >
      <motion.div
        animate={{ width: `${progress}%`, opacity: loading || progress > 0 ? 1 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="h-full"
        style={{ background: color }}
      />
    </div>
  );
}
