"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

/**
 * MarkerHighlight — a felt-tip stroke drawn behind a few words when they
 * scroll into view.
 *
 * THE STROKE IS AN IMAGE, NOT A BOX. The highlight is an SVG rectangle whose
 * edges are pushed about by a turbulence displacement filter, painted as the
 * span's background image, so it has the ragged edge and the slightly uneven
 * ink of a real marker. A CSS box with a colour does not read as a pen.
 *
 * IT DRAWS FROM THE LEFT. The reveal is a transition on background-size from
 * 0% to 100%, which the browser can animate without touching layout. With
 * box-decoration-break: clone, a phrase that wraps gets its own stroke on
 * every line, and every line draws at once.
 *
 * IT WAITS FOR YOU. By default the stroke draws when 60% of the phrase is on
 * screen, once. Pass `active` to drive it yourself (a step in a tour, a form
 * error, a hover on the sentence). Under prefers-reduced-motion the stroke is
 * simply there, with no draw — and that is checked live, so a reader who
 * toggles the setting mid-page gets the change without a reload.
 *
 * Highlighter is a light-ground device: keep the text dark. On a dark theme,
 * put the phrase on a paper plate rather than fighting it with blend modes.
 */

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** The stroke: a rect with turbulence-displaced edges, stretched to any word length. */
function strokeImage(colour: string, seed: number, opacity: number, tilt: number) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" preserveAspectRatio="none">' +
    '<filter id="r" x="-6%" y="-25%" width="112%" height="150%">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.03 0.11" numOctaves="2" seed="' +
    seed +
    '"/>' +
    '<feDisplacementMap in="SourceGraphic" scale="8" xChannelSelector="R" yChannelSelector="G"/>' +
    "</filter>" +
    '<rect x="3" y="5" width="194" height="30" rx="2" fill="' +
    colour +
    '" fill-opacity="' +
    opacity +
    '" filter="url(#r)" transform="skewX(' +
    tilt +
    ')"/>' +
    "</svg>";
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const readReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const readReducedServer = () => false;

export function MarkerHighlight({
  children,
  colour = "#d6ff00",
  opacity = 0.82,
  duration = 900,
  delay = 0,
  active,
  once = true,
  className = "",
}: {
  children: React.ReactNode;
  /** Ink colour of the stroke. Hex only. */
  colour?: string;
  /** 0–1. Real marker ink is translucent; 1 reads as a printed bar. */
  opacity?: number;
  /** Draw time in ms. */
  duration?: number;
  /** Delay before the draw starts, in ms — stagger several phrases. */
  delay?: number;
  /** Drive the stroke yourself. Leave undefined to draw on view. */
  active?: boolean;
  /** Draw once and stay (default), or undraw when the phrase leaves view. */
  once?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduced, readReduced, readReducedServer);

  // A stable seed per instance, so two phrases on one page do not share the
  // same ragged edge. useId is not a number, so it is folded into one.
  const id = useId();
  let seed = 7;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) % 997;

  useEffect(() => {
    if (active !== undefined) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        // The last entry is the current one; an observer can batch several.
        const hit = entries[entries.length - 1].isIntersecting;
        if (hit) {
          setSeen(true);
          if (once) io.disconnect();
        } else if (!once) {
          setSeen(false);
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active, once]);

  const on = active ?? seen;
  const ink = HEX.test(colour) ? colour : "#d6ff00";
  const alpha = Math.min(1, Math.max(0, opacity));

  return (
    <span
      ref={ref}
      className={"relative " + className}
      data-highlighted={on ? "true" : "false"}
      style={{
        backgroundImage: strokeImage(ink, seed, alpha, -1.5),
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
        backgroundSize: (on ? 100 : 0) + "% 100%",
        transition: reduced ? "none" : "background-size " + duration + "ms " + EASE + " " + delay + "ms",
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
        padding: "0.04em 0.14em",
        margin: "0 -0.14em",
      }}
    >
      {children}
    </span>
  );
}
