"use client";

const ITEMS = ["Design", "Ship", "Iterate", "Repeat", "Vibe Code"];

export function MarqueeTicker({
  items = ITEMS.join(", "),
  speed = 24,
  direction = "left",
  pauseOnHover = true,
}: {
  /** Comma-separated. */
  items?: string;
  speed?: number;
  direction?: "left" | "right";
  pauseOnHover?: boolean;
}) {
  const words = items
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);
  const track = [...words, ...words];

  return (
    <div className="group relative w-full overflow-hidden py-3">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent" />
      <div
        className={
          "flex w-max gap-8 " +
          (pauseOnHover ? "group-hover:[animation-play-state:paused]" : "")
        }
        style={{
          animation: `marquee ${speed}s linear infinite`,
          animationDirection: direction === "right" ? "reverse" : "normal",
        }}
      >
        {track.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex items-center gap-8 text-2xl font-bold tracking-tight whitespace-nowrap"
          >
            {item}
            <span className="text-red-500">&bull;</span>
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
