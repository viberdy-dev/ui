"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * CaptureLoopCard — a bento tile whose picture is a tightly cropped loop of
 * the product itself: a few seconds of a real screen, cut down to the one
 * detail that proves the feature.
 *
 * It holds still until someone shows interest. A mouse over the tile plays
 * the loop and leaving pauses it; on touch and from the keyboard a small
 * play and pause control does the same, and it is always there, so motion
 * can be stopped at any time. A hairline under the picture tracks the loop.
 * The loop pauses when the tile leaves the screen, and hover never starts it
 * under reduced motion (the control still does).
 *
 * Give it a muted MP4 or WebM (4–8s, cropped tight) and a poster frame. Or
 * draw the capture in code as children: the picture sets --clc-play to
 * "running" or "paused", so a CSS animation with
 * `animation-play-state: var(--clc-play)` plays and pauses with the tile.
 *
 * Needs Tailwind v4. No dependencies beyond React.
 */

export type CaptureLoopCardProps = {
  /** Small mono label above the title. */
  label?: string;
  title: string;
  body?: string;
  /** Makes the whole tile a link (the control stays its own button). */
  href?: string;
  /** Video sources, most efficient first, e.g. [{ src: "/loop.webm", type: "video/webm" }]. Paths are relative or http(s). */
  sources?: { src: string; type?: string }[];
  poster?: string;
  /** Video only: where the crop centres, as CSS object-position, e.g. "30% 20%". */
  focus?: string;
  /** Video only: zoom into the focus point for a tighter crop, 1 to 2. */
  zoom?: number;
  /** Describes what the loop shows. Without it the picture is decorative. */
  alt?: string;
  /** Loop length for code-drawn captures, in ms (the video reports its own). */
  loopMs?: number;
  /** "lg" for a 2x2 hero tile: a larger title and body. */
  size?: "md" | "lg";
  /** A code-drawn capture, used when there are no sources. */
  children?: ReactNode;
  className?: string;
};

const MONO = "var(--font-mono, var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace))";

/** Allow relative paths, fragments, http(s), mailto and tel; anything else becomes "#". */
function safeHref(href: string): string {
  const v = href.replace(/[\t\n\r]/g, "").trim();
  if (v.indexOf(String.fromCharCode(92)) !== -1) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#?]/.test(v) && !/^\/\//.test(v)) return v;
  return "#";
}

/** Media URLs: http(s) or a relative path (no other scheme, not //); anything else is dropped. */
function safeSrc(src: string | undefined): string | undefined {
  if (!src) return undefined;
  const v = src.replace(/[\t\n\r]/g, "").trim();
  if (!v || v.indexOf(String.fromCharCode(92)) !== -1) return undefined;
  if (/^https?:\/\//i.test(v)) return v;
  if (!/^[^/?#]*:/.test(v) && !/^\/\//.test(v)) return v;
  return undefined;
}

const RM = "(prefers-reduced-motion: reduce)";
function onMotionChange(cb: () => void) {
  const mq = window.matchMedia(RM);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function CaptureLoopCard({
  label,
  title,
  body,
  href,
  sources,
  poster,
  focus = "50% 50%",
  zoom = 1,
  alt,
  loopMs = 6000,
  size = "md",
  children,
  className = "",
}: CaptureLoopCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const light = useRef({ x: 0, y: 0, raf: 0 });

  // Playing is derived: pinned by the control, or hovered by a mouse (unless
  // the control just paused it, until the pointer leaves).
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const [held, setHeld] = useState(false);
  const motionOk = useSyncExternalStore(
    onMotionChange,
    () => !window.matchMedia(RM).matches,
    () => true,
  );
  const playing = pinned || (hover && !held && motionOk);

  const clean = (sources ?? []).map((s) => ({ src: safeSrc(s.src), type: s.type })).filter((s) => s.src);
  const video = clean.length > 0;
  const z = Math.min(2, Math.max(1, zoom));

  // Off screen, the loop stops and forgets the pin, the hover and the hold
  // (scrolling with a wheel under a still pointer fires no pointerleave).
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) {
        setPinned(false);
        setHover(false);
        setHeld(false);
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Video: play and pause it, and draw the hairline from its clock.
  useEffect(() => {
    const v = videoRef.current;
    const bar = barRef.current;
    if (!video || !v) return;
    let raf = 0;
    const draw = () => {
      if (bar && v.duration) bar.style.transform = "scaleX(" + (v.currentTime / v.duration).toFixed(4) + ")";
      raf = requestAnimationFrame(draw);
    };
    let live = true;
    if (playing) {
      const p = v.play();
      if (p)
        p.catch(() => {
          if (live) setPinned(false);
        });
      raf = requestAnimationFrame(draw);
    } else v.pause();
    return () => {
      live = false;
      cancelAnimationFrame(raf);
    };
  }, [playing, video]);

  // Code-drawn: the hairline is one animation that plays and pauses with it.
  const barAnim = useRef<Animation | null>(null);
  useEffect(() => {
    const bar = barRef.current;
    if (video || !bar) return;
    const a = bar.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      duration: Math.max(500, loopMs),
      iterations: Infinity,
      easing: "linear",
    });
    a.pause();
    barAnim.current = a;
    return () => {
      a.cancel();
      barAnim.current = null;
    };
  }, [video, loopMs]);
  useEffect(() => {
    const a = barAnim.current;
    if (!a) return;
    if (playing) a.play();
    else a.pause();
  }, [playing]);

  useEffect(() => {
    const l = light.current;
    return () => cancelAnimationFrame(l.raf);
  }, []);

  function onMove(e: ReactPointerEvent<HTMLElement>) {
    light.current.x = e.clientX;
    light.current.y = e.clientY;
    if (light.current.raf) return;
    const el = e.currentTarget;
    light.current.raf = requestAnimationFrame(() => {
      light.current.raf = 0;
      const r = el.getBoundingClientRect();
      const k = el.offsetWidth / (r.width || 1);
      el.style.setProperty("--clc-x", ((light.current.x - r.left) * k).toFixed(1) + "px");
      el.style.setProperty("--clc-y", ((light.current.y - r.top) * k).toFixed(1) + "px");
      el.style.setProperty("--clc-o", "1");
    });
  }

  function toggle() {
    if (playing) {
      setPinned(false);
      setHeld(true);
    } else {
      setHeld(false);
      setPinned(true);
    }
  }

  const lg = size === "lg";

  return (
    <article
      ref={cardRef}
      className={"group relative flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] bg-[#0f1012] p-1.5 text-white " + className}
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", "--clc-o": "0" } as CSSProperties}
      onPointerMove={onMove}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") {
          setHover(true);
          setHeld(false);
        }
      }}
      onPointerLeave={(e) => {
        cancelAnimationFrame(light.current.raf);
        light.current.raf = 0;
        e.currentTarget.style.setProperty("--clc-o", "0");
        setHover(false);
        setHeld(false);
      }}
    >
      {/* The pointer light: a lit hairline ring and a faint glow. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[20px] transition-opacity duration-200"
        style={{
          opacity: "var(--clc-o)",
          padding: 1,
          background: "radial-gradient(180px circle at var(--clc-x, -999px) var(--clc-y, -999px), rgba(255,255,255,0.7), rgba(255,255,255,0) 70%)",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[20px] transition-opacity duration-200"
        style={{
          opacity: "var(--clc-o)",
          background: "radial-gradient(260px circle at var(--clc-x, -999px) var(--clc-y, -999px), rgba(255,255,255,0.07), rgba(255,255,255,0) 70%)",
        }}
      />

      {/* The capture, cropped tight. */}
      <div
        role={alt ? "img" : undefined}
        aria-label={alt}
        aria-hidden={alt ? undefined : true}
        data-playing={playing ? "" : undefined}
        onClick={href ? undefined : toggle}
        className={"relative min-h-0 flex-1 overflow-hidden rounded-[14px] bg-[#131417]" + (href ? "" : " cursor-pointer")}
        style={{ "--clc-play": playing ? "running" : "paused" } as CSSProperties}
      >
        {video ? (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="metadata"
            poster={safeSrc(poster)}
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: focus, transform: z > 1 ? "scale(" + z + ")" : undefined, transformOrigin: focus }}
          >
            {clean.map((s) => (
              <source key={s.src} src={s.src} type={s.type} />
            ))}
          </video>
        ) : (
          <div className="absolute inset-0">{children}</div>
        )}
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[14px]" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }} />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10">
          <span ref={barRef} className="absolute inset-0 origin-left bg-white/70" style={{ transform: "scaleX(0)" }} />
        </span>
      </div>

      <div className={lg ? "px-4 pt-5 pb-4" : "px-3 pt-4 pb-3"}>
        {label && (
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/50" style={{ fontFamily: MONO }}>
            {label}
          </p>
        )}
        <h3 className={(lg ? "mt-2 text-[24px] leading-[1.15]" : "mt-1.5 text-[17px] leading-snug") + " font-semibold tracking-[-0.015em]"}>
          {href ? (
            <a
              href={safeHref(href)}
              className="rounded-[6px] outline-none after:absolute after:inset-0 after:z-10 after:rounded-[20px] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-white/80"
            >
              {title}
            </a>
          ) : (
            title
          )}
        </h3>
        {body && <p className={(lg ? "mt-2 max-w-[46ch] text-[15px]" : "mt-1.5 text-[13px]") + " leading-snug text-white/55"}>{body}</p>}
      </div>

      {/* Always there, so the motion can always be stopped. */}
      <button
        type="button"
        aria-label={playing ? "Pause loop" : "Play loop"}
        onClick={toggle}
        className="absolute top-3 right-3 z-30 grid size-8 place-items-center rounded-[8px] bg-[#0f1012] text-white/80 outline-none transition-colors duration-200 hover:bg-[#16171a] hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 motion-reduce:transition-none"
        style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
      >
        <svg aria-hidden width="12" height="12" viewBox="0 0 12 12">
          {playing ? (
            <path d="M3.5 2.5v7M8.5 2.5v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          ) : (
            <path d="M3.5 2.2v7.6L9.6 6z" fill="currentColor" />
          )}
        </svg>
      </button>
    </article>
  );
}
