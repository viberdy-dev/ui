"use client";

import { useEffect, useState } from "react";

export function TypewriterText({
  phrases = ["Build fast.", "Ship faster.", "Vibe code."],
  typeSpeed = 60,
  pauseMs = 1400,
}: {
  phrases?: string[];
  typeSpeed?: number;
  pauseMs?: number;
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"typing" | "pausing" | "erasing">("typing");

  useEffect(() => {
    const current = phrases[phraseIndex % phrases.length] ?? "";

    if (mode === "typing") {
      if (text.length < current.length) {
        const t = setTimeout(() => setText(current.slice(0, text.length + 1)), typeSpeed);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setMode("pausing"), pauseMs);
      return () => clearTimeout(t);
    }

    if (mode === "pausing") {
      const t = setTimeout(() => setMode("erasing"), 0);
      return () => clearTimeout(t);
    }

    // erasing
    if (text.length > 0) {
      const t = setTimeout(() => setText(current.slice(0, text.length - 1)), typeSpeed / 2);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setPhraseIndex((i) => (i + 1) % phrases.length);
      setMode("typing");
    }, 200);
    return () => clearTimeout(t);
  }, [text, mode, phraseIndex, phrases, typeSpeed, pauseMs]);

  return (
    <span className="text-3xl font-black tracking-tight">
      {text}
      <span className="ml-0.5 inline-block w-[2px] translate-y-[2px] animate-pulse bg-red-500 align-baseline" style={{ height: "1em" }} />
    </span>
  );
}
