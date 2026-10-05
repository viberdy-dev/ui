"use client";

import { useEffect, useRef } from "react";

export function PointerWarpDotField({
  spacing = 18,
  radius = 80,
  strength = 26,
  connect = false,
}: {
  spacing?: number;
  radius?: number;
  strength?: number;
  /** Draw hairlines between vertically adjacent dots, so the warp reads as a mesh. */
  connect?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: -9999, y: -9999 });
  const frame = useRef<number | null>(null);

  // Options live on a ref so changing a prop adjusts the next frame instead
  // of tearing down and restarting the loop. Synced in an effect, NOT
  // assigned during render — writing ref.current mid-render is a render-phase
  // side effect and is unsafe under concurrent rendering.
  const opts = useRef({ spacing, radius, strength, connect });
  useEffect(() => {
    opts.current = { spacing, radius, strength, connect };
  }, [spacing, radius, strength, connect]);

  useEffect(() => {
    const el = canvasRef.current;
    const context = el?.getContext("2d");
    if (!el || !context) return;
    // Re-bound so resize() and draw() below, hoisted functions, see them as
    // non-null under strict TypeScript.
    const canvas: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    // Cap DPR at 2 — beyond that the pixel count grows faster than the
    // visible gain, and this is a decorative layer.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    function draw() {
      const rect = canvas.getBoundingClientRect();
      const { spacing: sp, radius: rad, strength: str, connect: link } = opts.current;
      ctx.clearRect(0, 0, rect.width, rect.height);

      const cols = Math.ceil(rect.width / sp) + 1;
      const rows = Math.ceil(rect.height / sp) + 1;
      const px = pointer.current.x;
      const py = pointer.current.y;

      let prevRow: { x: number; y: number }[] = [];

      for (let r = 0; r < rows; r++) {
        const row: { x: number; y: number }[] = [];
        for (let c = 0; c < cols; c++) {
          const ox = c * sp;
          const oy = r * sp;
          const dx = ox - px;
          const dy = oy - py;
          const dist = Math.hypot(dx, dy);

          let x = ox;
          let y = oy;
          let scale = 1;

          if (dist < rad && dist > 0.0001) {
            // Squared falloff gives the bulge a soft shoulder rather than a
            // hard circular edge.
            const f = Math.pow(1 - dist / rad, 2);
            x += (dx / dist) * f * str;
            y += (dy / dist) * f * str;
            scale = 1 + f * 1.6;
          }

          row.push({ x, y });

          ctx.beginPath();
          ctx.arc(x, y, scale, 0, Math.PI * 2);
          ctx.fillStyle =
            scale > 1.05 ? "rgba(61,123,255,0.9)" : "rgba(232,234,238,0.28)";
          ctx.fill();
        }

        if (link && prevRow.length) {
          ctx.strokeStyle = "rgba(232,234,238,0.08)";
          ctx.lineWidth = 1;
          for (let c = 0; c < row.length; c++) {
            ctx.beginPath();
            ctx.moveTo(prevRow[c].x, prevRow[c].y);
            ctx.lineTo(row[c].x, row[c].y);
            ctx.stroke();
          }
        }
        prevRow = row;
      }

      frame.current = requestAnimationFrame(draw);
    }

    frame.current = requestAnimationFrame(draw);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      onMouseMove={(e) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        // Ref, not state — the loop reads it each frame, so pointer movement
        // never triggers a React render.
        pointer.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }}
      onMouseLeave={() => {
        pointer.current = { x: -9999, y: -9999 };
      }}
      className="relative h-full w-full overflow-hidden bg-[#07080b]"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
