"use client";

export function GlitchText({
  text = "GLITCH",
  intensity = 3,
}: {
  text?: string;
  intensity?: number;
}) {
  return (
    <span
      className="group relative inline-block font-black tracking-tight"
      style={{ "--glitch-intensity": `${intensity}px` } as React.CSSProperties}
    >
      <span
        aria-hidden
        className="viberdy-glitch-layer absolute left-0 top-0 hidden text-red-500 group-hover:block"
        style={{ clipPath: "inset(0 0 55% 0)" }}
      >
        {text}
      </span>
      <span className="relative">{text}</span>
      <span
        aria-hidden
        className="viberdy-glitch-layer-2 absolute left-0 top-0 hidden text-cyan-300 group-hover:block"
        style={{ clipPath: "inset(55% 0 0 0)" }}
      >
        {text}
      </span>
      <style jsx>{`
        .viberdy-glitch-layer {
          animation: viberdy-glitch-shift-a 0.35s steps(2, jump-none) infinite;
        }
        .viberdy-glitch-layer-2 {
          animation: viberdy-glitch-shift-b 0.35s steps(2, jump-none) infinite;
        }
        @keyframes viberdy-glitch-shift-a {
          0% { transform: translate(0, 0); }
          50% { transform: translate(calc(var(--glitch-intensity, 3px) * -1), 1px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes viberdy-glitch-shift-b {
          0% { transform: translate(0, 0); }
          50% { transform: translate(var(--glitch-intensity, 3px), -1px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </span>
  );
}
