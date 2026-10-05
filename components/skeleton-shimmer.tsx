"use client";

export function SkeletonShimmer({ rows = 3, avatar = true, speed = 1.6 }: {
  rows?: number;
  avatar?: boolean;
  speed?: number;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex w-full max-w-sm items-start gap-3"
      style={{ "--shimmer-speed": `${speed}s` } as React.CSSProperties}
    >
      <span className="sr-only">Loading…</span>
      {avatar && <div className="shimmer h-11 w-11 shrink-0 rounded-full bg-neutral-200" />}
      <div className="flex flex-1 flex-col gap-2.5 pt-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="shimmer h-3 rounded-full bg-neutral-200"
            style={{ width: i === rows - 1 ? "60%" : "100%" }}
          />
        ))}
      </div>
      {/* speed comes in via the --shimmer-speed CSS variable set above, not
          a ${speed}s template interpolation inside this style block —
          interpolating directly into styled-jsx here compiles to a literal
          0s animation-duration, so the block stays fully static. */}
      <style jsx>{`
        .shimmer { position: relative; overflow: hidden; }
        .shimmer::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7) 50%, transparent);
          animation: shimmer-sweep var(--shimmer-speed, 1.6s) ease-in-out infinite;
        }
        @keyframes shimmer-sweep {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
