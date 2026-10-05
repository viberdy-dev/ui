"use client";

import { useRef, useState, type ReactNode } from "react";

export function CursorMaskReveal({
  base,
  top,
  radius = 72,
  feather = 30,
  showRing = true,
}: {
  /** The layer revealed under the pointer. */
  base: ReactNode;
  /** The layer the pointer punches a hole through. */
  top: ReactNode;
  radius?: number;
  /** 0-100. How soft the edge of the hole is. */
  feather?: number;
  /** Outline the hole so its edge is legible over busy content. */
  showRing?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Custom properties via a ref — the mask follows at pointer speed with no
    // React render per pixel.
    el.style.setProperty("--mx", e.clientX - rect.left + "px");
    el.style.setProperty("--my", e.clientY - rect.top + "px");
  }

  /*
   * A real CSS mask, not a radial gradient tinted over the content. That is
   * the difference between "a bright spot" and two genuinely different
   * treatments of the same area — the base layer can be any markup at all.
   * -webkit-mask-image is still required for Safari.
   */
  const maskImage =
    "radial-gradient(circle " +
    radius +
    "px at var(--mx) var(--my), #000 " +
    (100 - feather) +
    "%, transparent 100%)";

  return (
    <div
      ref={boxRef}
      onMouseMove={handleMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className="relative overflow-hidden"
      style={{ "--mx": "50%", "--my": "50%" } as React.CSSProperties}
    >
      <div className="absolute inset-0">{base}</div>

      <div
        className="absolute inset-0"
        style={{
          maskImage: active ? maskImage : undefined,
          WebkitMaskImage: active ? maskImage : undefined,
        }}
      >
        {top}
      </div>

      {showRing && active && (
        <span
          aria-hidden
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30"
          style={{ left: "var(--mx)", top: "var(--my)", width: radius * 2, height: radius * 2 }}
        />
      )}
    </div>
  );
}
