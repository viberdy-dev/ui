"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*";

export function ScrambleText({
  text,
  speed = 30,
  trigger = "hover",
}: {
  text: string;
  /** ms between scramble frames. Lower is faster and busier. */
  speed?: number;
  trigger?: "hover" | "mount";
}) {
  const [display, setDisplay] = useState(text);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A timer rather than requestAnimationFrame: the tick RATE is the whole
  // effect here, and rAF pins it to the display's refresh rate instead.
  const scramble = useCallback(() => {
    let iteration = 0;
    if (timer.current) clearTimeout(timer.current);

    function tick() {
      setDisplay(
        text
          .split("")
          .map((char, i) => {
            if (char === " ") return " ";
            if (i < iteration) return text[i];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join(""),
      );
      if (iteration >= text.length) return;
      // A third of a character per tick, so each letter is scrambled a few
      // times before it locks — resolving one per tick reads as a typewriter.
      iteration += 1 / 3;
      timer.current = setTimeout(tick, speed);
    }
    tick();
  }, [text, speed]);

  useEffect(() => {
    if (trigger === "mount") scramble();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [trigger, scramble]);

  return (
    <button
      onMouseEnter={() => trigger === "hover" && scramble()}
      className="font-mono text-2xl font-bold tracking-tight"
    >
      {display}
    </button>
  );
}
