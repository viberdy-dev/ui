"use client";

import { useRef, useState } from "react";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ":" + String(s).padStart(2, "0");
}

export function ScrubTimelinePlayer({
  height = 5,
  duration,
  value,
  buffered = 0,
  showHoverTime = true,
  onChange,
}: {
  height?: number;
  /** Timestamp bubble above the pointer while hovering the track. */
  showHoverTime?: boolean;
  duration: number;
  /** Current position, 0-100. */
  value: number;
  /** Buffered extent, 0-100. */
  buffered?: number;
  onChange: (next: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [hoverPct, setHoverPct] = useState<number | null>(null);

  function pctFromEvent(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  }

  return (
    <div
      ref={trackRef}
      /*
       * A real slider, not a div with a click handler: role, the three value
       * attributes, tabIndex and arrow keys are what make this operable
       * without a pointer and announced correctly. aria-valuetext carries the
       * formatted timestamp, since "42" is meaningless read aloud.
       */
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-valuetext={formatTime((value / 100) * duration)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onChange(Math.min(100, value + 2));
        if (e.key === "ArrowLeft") onChange(Math.max(0, value - 2));
      }}
      /*
       * POINTER events with setPointerCapture — not mousedown/mousemove.
       * Capture routes every later pointer event to this element even when the
       * pointer is outside its bounds, so the scrub survives dragging above or
       * below the bar. The mouse-event version silently stops there, which is
       * exactly what people do when scrubbing quickly.
       */
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setScrubbing(true);
        onChange(pctFromEvent(e.clientX));
      }}
      onPointerMove={(e) => {
        setHoverPct(pctFromEvent(e.clientX));
        if (scrubbing) onChange(pctFromEvent(e.clientX));
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setScrubbing(false);
      }}
      onPointerLeave={() => setHoverPct(null)}
      className="group relative cursor-pointer py-3"
    >
      <div
        className="relative w-full overflow-hidden rounded-full bg-white/15 transition-[height] duration-150"
        style={{ height: scrubbing ? height + 3 : height }}
      >
        <div className="absolute inset-y-0 left-0 bg-white/20" style={{ width: buffered + "%" }} />
        <div className="absolute inset-y-0 left-0 bg-blue-500" style={{ width: value + "%" }} />
      </div>

      <span
        className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-150 group-hover:scale-110"
        style={{ left: value + "%" }}
      />

      {showHoverTime && hoverPct !== null && (
        <span
          className="pointer-events-none absolute bottom-full -translate-x-1/2 rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-white"
          style={{ left: hoverPct + "%" }}
        >
          {formatTime((hoverPct / 100) * duration)}
        </span>
      )}
    </div>
  );
}
