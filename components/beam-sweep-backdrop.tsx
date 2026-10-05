"use client";

export function BeamSweepBackdrop({
  children,
  beams = 3,
  speed = 18,
  blur = 40,
  vignette = true,
}: {
  children?: React.ReactNode;
  beams?: number;
  speed?: number;
  blur?: number;
  /** Radial fade that pulls the beams away from the edges. */
  vignette?: boolean;
}) {
  return (
    // `isolate` is load-bearing: the beams sit at a negative z-index, and
    // position:relative alone does NOT create a stacking context, so without
    // it they escape behind the page background entirely.
    <div className="relative isolate overflow-hidden bg-[#07080b]">
      {/*
       * Own keyframes rather than Tailwind's `spin`: that one is only emitted
       * when an animate-spin utility appears in the scanned source, which a
       * copied-out component cannot rely on. Static by design — per-instance
       * duration and direction go through inline style, never interpolated here.
       */}
      <style>{"@keyframes beam-sweep-rotate { to { transform: translate(-50%, -50%) rotate(360deg); } }"}</style>

      {Array.from({ length: beams }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="absolute left-1/2 top-1/2 -z-10 aspect-square w-[180%] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "conic-gradient(from " +
              i * 120 +
              "deg, transparent 0deg, #3d7bff " +
              (14 + i * 6) +
              "deg, transparent " +
              (34 + i * 8) +
              "deg, transparent 360deg)",
            filter: "blur(" + blur + "px)",
            opacity: 0.28 - i * 0.06,
            // The keyframe carries the -50%/-50% translate itself, because an
            // animation on transform replaces the class-based translate rather
            // than composing with it.
            animation:
              "beam-sweep-rotate " +
              (speed + i * 7) +
              "s linear infinite" +
              (i % 2 ? " reverse" : ""),
          }}
        />
      ))}

      {vignette && (
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 30%, #07080b 78%)",
          }}
        />
      )}

      <div className="relative">{children}</div>
    </div>
  );
}
