"use client";

import { useRef, useState } from "react";

const ITEMS = [
  { title: "Fast", body: "Ships in minutes, not sprints." },
  { title: "Sharp", body: "Every pixel earns its place." },
  { title: "Alive", body: "Motion that means something." },
  { title: "Yours", body: "Copy it, bend it, ship it." },
];

export function SpotlightGrid({
  radius = 220,
  columns = 2,
  intensity = 0.16,
}: {
  radius?: number;
  columns?: number;
  /** Peak alpha of the spotlight wash, 0-1. */
  intensity?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -9999, y: -9999 });
  const [active, setActive] = useState(false);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className="relative grid gap-3 rounded-2xl border border-black/10 bg-neutral-100 p-3"
      style={{ gridTemplateColumns: "repeat(" + columns + ", minmax(0, 1fr))" }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          opacity: active ? 1 : 0,
          background: `radial-gradient(${radius}px circle at ${pos.x}px ${pos.y}px, rgba(255,45,45,${intensity}), transparent 70%)`,
        }}
      />
      {ITEMS.map((item) => (
        <div key={item.title} className="relative z-10 rounded-xl border border-black/10 bg-white p-4">
          <h4 className="mb-1 text-base font-bold">{item.title}</h4>
          <p className="text-sm text-black/60">{item.body}</p>
        </div>
      ))}
    </div>
  );
}
