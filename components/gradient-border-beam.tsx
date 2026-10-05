"use client";

export function BorderBeamCard({
  label = "Border beam",
  speed = 4,
}: {
  label?: string;
  speed?: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-[2px]"
      style={{ "--beam-speed": `${speed}s` } as React.CSSProperties}
    >
      <div className="viberdy-beam-spin pointer-events-none absolute inset-[-50%]" />
      <div className="relative flex h-32 w-64 items-center justify-center rounded-2xl bg-neutral-900">
        <span className="font-bold text-white">{label}</span>
      </div>
      <style jsx>{`
        .viberdy-beam-spin {
          background: conic-gradient(from 0deg, transparent 0%, #ff2d2d 8%, transparent 18%);
          animation: viberdy-beam-rotate var(--beam-speed, 4s) linear infinite;
        }
        @keyframes viberdy-beam-rotate {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
