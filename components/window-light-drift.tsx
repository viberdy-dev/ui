"use client";

import { useEffect, useRef } from "react";

/**
 * WindowLightDrift — afternoon sun through a window, drifting across a wall.
 *
 * One slanted shaft of light, broken by the shadows of the window bars, crosses
 * the wall and back over a minute and a half, and breathes very slightly as if
 * clouds were passing. It is a background for a café, a salon or a studio: a
 * room, not a graphic. Your pointer is a hand in the light — it casts a soft
 * shadow on the wall, and only where the light falls.
 *
 * Everything is drawn on one canvas. The light is built on an offscreen layer
 * (a gradient-edged shaft, cut by the bars and the pointer shadow with
 * destination-out compositing), laid over the wall, then dusted with a fixed
 * grain tile so the wall reads as plaster rather than a flat fill. The loop is
 * time-based, sleeps off-screen and in hidden tabs, and under
 * prefers-reduced-motion it draws one still frame — the pointer shadow still
 * works there, because the reader is driving it.
 *
 * Place it as the FIRST child of a position: relative section. Pointer events
 * are read from that parent, so copy and buttons above it never block the
 * shadow.
 */

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function hex(v: string, fallback: string) {
  return HEX.test(v) ? v : fallback;
}

function rgba(colour: string, alpha: number) {
  let h = colour.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
}

/** A 160px tile of fine grain, drawn once and repeated. */
function makeGrain() {
  const tile = document.createElement("canvas");
  tile.width = 160;
  tile.height = 160;
  const c = tile.getContext("2d");
  if (!c) return null;
  const img = c.createImageData(160, 160);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 90 + Math.floor(Math.random() * 120);
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return tile;
}

export function WindowLightDrift({
  wall = "#151412",
  light = "#f4d9a6",
  angle = 22,
  bars = 2,
  speed = 1,
  grain = 0.5,
  shadow = true,
  className = "",
}: {
  /** Wall colour. Hex only. */
  wall?: string;
  /** Colour of the light. Hex only — warm for afternoon, blue-white for a north window. */
  light?: string;
  /** Slant of the shaft in degrees, 0–40. */
  angle?: number;
  /** Vertical window bars crossing the shaft, 0–4. */
  bars?: number;
  /** Drift speed multiplier. 1 crosses the wall and back in 90 seconds; 0 holds still. */
  speed?: number;
  /** Plaster grain, 0–1. */
  grain?: number;
  /** The pointer casts a soft shadow where it crosses the light. */
  shadow?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Props are read by the render loop through a ref, so a change adjusts the
  // next frame instead of tearing the loop down. Synced from an effect.
  const opts = useRef({ wall, light, angle, bars, speed, grain, shadow });
  const refresh = useRef<() => void>(() => {});
  useEffect(() => {
    opts.current = { wall, light, angle, bars, speed, grain, shadow };
    refresh.current();
  }, [wall, light, angle, bars, speed, grain, shadow]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas ? canvas.parentElement : null;
    const ctx = canvas ? canvas.getContext("2d") : null;
    if (!canvas || !host || !ctx) return;
    const layer = document.createElement("canvas");
    const lctx = layer.getContext("2d");
    if (!lctx) return;
    const grainTile = makeGrain();
    const grainPattern = grainTile ? ctx.createPattern(grainTile, "repeat") : null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let W = 0;
    let H = 0;
    let dpr = 1;
    let raf = 0;
    let onScreen = true;
    let hidden = document.visibilityState === "hidden";
    let last = 0;
    let t = 0; // seconds of drift, only advanced while motion is allowed
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, a: 0, ta: 0 };

    function layout() {
      // Layout size, not the bounding rect: the rect includes ancestor
      // transforms, so inside a scaled card the light would fill only part of
      // the box, and a ResizeObserver never re-fires to correct it.
      W = host!.clientWidth;
      H = host!.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      // Keep the backing store under ~8 megapixels on huge screens.
      while (W * H * dpr * dpr > 8e6 && dpr > 1) dpr = Math.max(1, dpr - 0.25);
      canvas!.width = layer.width = Math.max(1, Math.round(W * dpr));
      canvas!.height = layer.height = Math.max(1, Math.round(H * dpr));
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";
    }

    function paintLight() {
      const o = opts.current;
      const c = hex(o.light, "#f4d9a6");
      const T = 90 / Math.max(0.05, o.speed);
      const sway = Math.sin((t / T) * Math.PI * 2);
      const breathe = 0.84 + 0.16 * Math.sin((t / 41) * Math.PI * 2 + 1);
      const sw = Math.min(W * 0.46, Math.max(160, H * 0.75));
      const cx = W * 0.5 + sway * Math.max(0, W * 0.5 - sw * 0.35);
      const k = Math.tan((Math.max(0, Math.min(40, o.angle)) * Math.PI) / 180);

      lctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx!.globalCompositeOperation = "source-over";
      lctx!.clearRect(0, 0, W, H);

      // The shaft: a soft-edged band in a space skewed about the wall's middle.
      lctx!.transform(1, 0, -k, 1, k * H * 0.5, 0);
      const g = lctx!.createLinearGradient(cx - sw / 2, 0, cx + sw / 2, 0);
      g.addColorStop(0, rgba(c, 0));
      g.addColorStop(0.16, rgba(c, breathe));
      g.addColorStop(0.84, rgba(c, breathe));
      g.addColorStop(1, rgba(c, 0));
      lctx!.fillStyle = g;
      lctx!.fillRect(cx - sw / 2, -H * 0.2, sw, H * 1.4);

      // Fade at the top and the floor, so the shaft does not read as a stripe.
      lctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx!.globalCompositeOperation = "destination-in";
      const v = lctx!.createLinearGradient(0, 0, 0, H);
      v.addColorStop(0, "rgba(0,0,0,0.5)");
      v.addColorStop(0.35, "rgba(0,0,0,1)");
      v.addColorStop(0.78, "rgba(0,0,0,1)");
      v.addColorStop(1, "rgba(0,0,0,0.25)");
      lctx!.fillStyle = v;
      lctx!.fillRect(0, 0, W, H);

      // The window bars: cut out of the light, in the skewed space.
      lctx!.globalCompositeOperation = "destination-out";
      lctx!.transform(1, 0, -k, 1, k * H * 0.5, 0);
      const n = Math.max(0, Math.min(4, Math.round(o.bars)));
      const bw = sw * 0.045;
      for (let i = 1; i <= n; i++) {
        const bx = cx - sw / 2 + (sw * i) / (n + 1);
        const bg = lctx!.createLinearGradient(bx - bw, 0, bx + bw, 0);
        bg.addColorStop(0, "rgba(0,0,0,0)");
        bg.addColorStop(0.38, "rgba(0,0,0,0.9)");
        bg.addColorStop(0.62, "rgba(0,0,0,0.9)");
        bg.addColorStop(1, "rgba(0,0,0,0)");
        lctx!.fillStyle = bg;
        lctx!.fillRect(bx - bw, -H * 0.2, bw * 2, H * 1.4);
      }

      // The transom: one horizontal bar, level on the wall.
      lctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ty = H * 0.44;
      const th = Math.max(5, H * 0.012);
      const tg = lctx!.createLinearGradient(0, ty - th, 0, ty + th);
      tg.addColorStop(0, "rgba(0,0,0,0)");
      tg.addColorStop(0.4, "rgba(0,0,0,0.88)");
      tg.addColorStop(0.6, "rgba(0,0,0,0.88)");
      tg.addColorStop(1, "rgba(0,0,0,0)");
      lctx!.fillStyle = tg;
      lctx!.fillRect(0, ty - th, W, th * 2);

      // The hand: a soft shadow that only exists where there is light to block.
      if (pointer.a > 0.002) {
        const r = Math.max(60, Math.min(W, H) * 0.16);
        const sg = lctx!.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, r);
        sg.addColorStop(0, "rgba(0,0,0," + 0.62 * pointer.a + ")");
        sg.addColorStop(0.55, "rgba(0,0,0," + 0.3 * pointer.a + ")");
        sg.addColorStop(1, "rgba(0,0,0,0)");
        lctx!.fillStyle = sg;
        lctx!.fillRect(pointer.x - r, pointer.y - r, r * 2, r * 2);
      }
      lctx!.globalCompositeOperation = "source-over";
    }

    function draw() {
      if (!W || !H) return;
      const o = opts.current;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.globalCompositeOperation = "source-over";
      ctx!.globalAlpha = 1;
      ctx!.fillStyle = hex(o.wall, "#151412");
      ctx!.fillRect(0, 0, W, H);
      paintLight();
      ctx!.drawImage(layer, 0, 0, W, H);
      if (grainPattern && o.grain > 0) {
        // Device pixels, so the grain stays fine on a retina screen.
        ctx!.setTransform(1, 0, 0, 1, 0, 0);
        ctx!.globalCompositeOperation = "overlay";
        ctx!.globalAlpha = Math.min(1, o.grain) * 0.34;
        ctx!.fillStyle = grainPattern;
        ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
        ctx!.globalAlpha = 1;
        ctx!.globalCompositeOperation = "source-over";
      }
    }

    function frame(now: number) {
      raf = 0;
      // Time-based and clamped, so a long pause never jumps the light.
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      if (!reduce.matches) t += dt;
      const kp = 1 - Math.exp(-dt / 0.22);
      pointer.x += (pointer.tx - pointer.x) * kp;
      pointer.y += (pointer.ty - pointer.y) * kp;
      pointer.a += (pointer.ta - pointer.a) * kp;
      draw();
      const settling =
        Math.abs(pointer.a - pointer.ta) > 0.003 ||
        (pointer.ta > 0 && (Math.abs(pointer.tx - pointer.x) > 0.4 || Math.abs(pointer.ty - pointer.y) > 0.4));
      const ambient = !reduce.matches && opts.current.speed > 0;
      if (onScreen && !hidden && (ambient || settling)) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    function start() {
      if (!raf) raf = requestAnimationFrame(frame);
    }
    refresh.current = () => {
      draw();
      start();
    };

    function toLocal(e: PointerEvent) {
      const rect = host!.getBoundingClientRect();
      // Back out any ancestor scale: rect is projected, W/H are layout.
      return {
        x: ((e.clientX - rect.left) * W) / Math.max(1, rect.width),
        y: ((e.clientY - rect.top) * H) / Math.max(1, rect.height),
      };
    }
    function onMove(e: PointerEvent) {
      if (!opts.current.shadow) return;
      const p = toLocal(e);
      if (pointer.ta === 0) {
        // First entry: appear in place rather than sweeping in from the corner.
        pointer.x = p.x;
        pointer.y = p.y;
      }
      pointer.tx = p.x;
      pointer.ty = p.y;
      pointer.ta = 1;
      start();
    }
    function onLeave() {
      pointer.ta = 0;
      start();
    }
    function onVisibility() {
      hidden = document.visibilityState === "hidden";
      if (!hidden) start();
    }
    function onReduce() {
      start();
    }

    layout();
    draw();
    const ro = new ResizeObserver(() => {
      layout();
      draw();
    });
    ro.observe(host);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      if (onScreen) start();
    });
    io.observe(host);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    reduce.addEventListener("change", onReduce);
    start();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      reduce.removeEventListener("change", onReduce);
      refresh.current = () => {};
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={"pointer-events-none absolute inset-0 block " + className}
    />
  );
}
