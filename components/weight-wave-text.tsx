"use client";

import { useEffect, useRef } from "react";

export function WeightWaveText({
  text,
  minWeight = 200,
  maxWeight = 900,
  reach = 110,
}: {
  text: string;
  minWeight?: number;
  maxWeight?: number;
  reach?: number;
}) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pointer = useRef<number | null>(null);
  // Restarts the loop after it has gone to sleep (see below).
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    if (!hostRef.current) return;
    const host: HTMLSpanElement = hostRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;
    let onScreen = false;
    let t = 0;
    let last = 0;

    function loop() {
      frame = null;
      const now = performance.now();
      // Time-based, not per-frame: a fixed step per frame would run twice as
      // fast on a 120Hz screen. Clamped so a long pause can't jump the wave.
      const dt = last ? Math.min(100, now - last) : 16.7;
      last = now;
      t += (dt / 1000) * 1.2;

      const chars = charRefs.current;
      const at = pointer.current;
      let intensities: number[];
      if (at !== null) {
        // Every read first, then every write. Measuring a letter right after
        // restyling its neighbour forces a fresh layout per letter, per frame.
        const left = host.getBoundingClientRect().left;
        intensities = chars.map((el) => {
          if (!el) return 0;
          const rect = el.getBoundingClientRect();
          const d = Math.abs(rect.left + rect.width / 2 - left - at);
          // Squared falloff so the swell has a soft shoulder.
          return Math.pow(Math.max(0, 1 - d / reach), 2);
        });
      } else if (!reduce.matches) {
        // Idle: a slow sine wave travelling the line, so the headline is
        // alive before anyone interacts with it.
        intensities = chars.map((_, i) => ((Math.sin(t - i * 0.45) + 1) / 2) * 0.55);
      } else {
        // Reduced motion: no drift. The letters rest at the minimum weight
        // and only respond to the pointer, which the reader controls.
        intensities = chars.map(() => 0);
      }

      chars.forEach((el, i) => {
        if (!el) return;
        const weight = Math.round(minWeight + (maxWeight - minWeight) * intensities[i]);
        // Written straight to the element. A setState per frame would
        // re-render the whole headline ~60 times a second.
        el.style.fontVariationSettings = '"wght" ' + weight;
      });

      // Keep running only while there is something to animate: the pointer
      // is over the line, or the idle wave is on and the line is on screen.
      // Otherwise sleep until wake() is called.
      if (at !== null || (onScreen && !reduce.matches)) frame = requestAnimationFrame(loop);
      else last = 0;
    }

    function start() {
      if (frame === null) frame = requestAnimationFrame(loop);
    }
    wake.current = start;

    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      if (onScreen) start();
    });
    io.observe(host);
    reduce.addEventListener("change", start);
    start();

    return () => {
      io.disconnect();
      reduce.removeEventListener("change", start);
      if (frame !== null) cancelAnimationFrame(frame);
      wake.current = () => {};
    };
  }, [minWeight, maxWeight, reach]);

  return (
    <span
      ref={hostRef}
      onMouseMove={(e) => {
        const rect = hostRef.current?.getBoundingClientRect();
        if (!rect) return;
        pointer.current = e.clientX - rect.left;
        wake.current();
      }}
      onMouseLeave={() => {
        pointer.current = null;
        wake.current();
      }}
      className="cursor-default select-none text-5xl leading-none tracking-tight"
    >
      {/* One accessible copy; the per-character spans are decorative. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.split("").map((ch, i) => (
          <span
            key={i}
            ref={(el) => {
              charRefs.current[i] = el;
            }}
            className="inline-block"
            style={{ fontVariationSettings: '"wght" ' + minWeight }}
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
      </span>
    </span>
  );
}
