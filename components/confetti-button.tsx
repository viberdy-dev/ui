"use client";

import { useState } from "react";

type Particle = { id: number; x: number; y: number; rotate: number; color: string; size: number };

const COLORS = ["#FF2D2D", "#FAFAFA", "#E0141F", "#B8B8B8"];
let particleId = 0;

export function ConfettiButton({ label = "Click me", count = 18, spread = 70 }: {
  label?: string;
  count?: number;
  spread?: number;
}) {
  const [particles, setParticles] = useState<Particle[]>([]);

  function burst() {
    const next: Particle[] = Array.from({ length: count }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const distance = spread * (0.4 + Math.random() * 0.6);
      return {
        id: particleId++,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotate: Math.random() * 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 5,
      };
    });
    setParticles(next);
    window.setTimeout(() => setParticles([]), 700);
  }

  return (
    <div className="relative flex items-center justify-center">
      {particles.map((p) => (
        <span
          key={p.id}
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-sm opacity-0"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            animation: "confetti-fly 700ms ease-out forwards",
            "--tx": `${p.x}px`,
            "--ty": `${p.y}px`,
            "--tr": `${p.rotate}deg`,
          } as React.CSSProperties}
        />
      ))}
      <button onClick={burst} className="rounded-full bg-red-500 px-6 py-3 font-bold text-white">
        {label}
      </button>
      <style jsx>{`
        @keyframes confetti-fly {
          0% { opacity: 1; transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); }
          100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) rotate(var(--tr)); }
        }
      `}</style>
    </div>
  );
}
