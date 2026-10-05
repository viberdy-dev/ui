"use client";

import { useRef, useState } from "react";

export function CursorCrosshairReadout({
  children,
  showReadout = true,
  showRings = true,
  lineStyle = "dashed",
}: {
  children?: React.ReactNode;
  showReadout?: boolean;
  /** The centre ring and its dot. Off leaves only the two guides. */
  showRings?: boolean;
  lineStyle?: "dashed" | "solid";
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    // Lines follow synchronously via custom properties — no re-render.
    el.style.setProperty("--cx", x + "px");
    el.style.setProperty("--cy", y + "px");

    // Only the numeric readout needs React, throttled to one update a frame.
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setCoords({ x, y });
    });
  }

  const border = lineStyle === "solid" ? "border-solid" : "border-dashed";

  return (
    <div
      ref={boxRef}
      onMouseMove={handleMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className="relative cursor-none overflow-hidden"
      style={{ "--cx": "50%", "--cy": "50%" } as React.CSSProperties}
    >
      {children}

      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{ opacity: active ? 1 : 0 }}
      >
        <div
          className={"absolute left-0 w-full border-t " + border + " border-white/40"}
          style={{ top: "var(--cy)" }}
        />
        <div
          className={"absolute top-0 h-full border-l " + border + " border-white/40"}
          style={{ left: "var(--cx)" }}
        />

        {showRings && (
          <>
            <div
              className="absolute size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35"
              style={{ left: "var(--cx)", top: "var(--cy)" }}
            />
            <div
              className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500"
              style={{ left: "var(--cx)", top: "var(--cy)" }}
            />
          </>
        )}

        {showReadout && (
          <div
            className="absolute translate-x-4 translate-y-4 rounded border border-white/20 bg-black px-2 py-1 font-mono text-[10px] tabular-nums text-white"
            style={{ left: "var(--cx)", top: "var(--cy)" }}
          >
            X {String(coords.x).padStart(3, "0")} · Y {String(coords.y).padStart(3, "0")}
          </div>
        )}
      </div>
    </div>
  );
}
