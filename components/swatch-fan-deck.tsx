"use client";

import { useRef, useState } from "react";

/**
 * SwatchFanDeck — a fan deck of paint chips that spreads in your hand.
 *
 * At rest the chips sit in a loose stack. Hover, touch or tab into the deck and
 * they fan out around a pivot below the deck, like a hand of cards; pick one and
 * it lifts clear of the others. It is a colour picker for the trades that sell
 * colour — decorators, nail bars, tattoo studios, apparel — where a row of
 * circles says nothing and a physical chip says "we have this in stock".
 *
 * IT IS A RADIO GROUP. Every chip is a real button with role="radio", so the
 * arrow keys move the selection, Home and End jump to the ends, and only the
 * selected chip is in the tab order (roving tabindex). Screen readers hear the
 * colour's name and code, never a hex value.
 *
 * THE FAN IS GEOMETRY, NOT A GUESS. The deck's box is sized from the spread
 * angle and the pivot radius, so the outer chips never clip, whatever the
 * chip size. Only transforms animate (620ms, slow enough to read as a hand
 * moving), and nothing animates under prefers-reduced-motion.
 */

export type Swatch = {
  name: string;
  /** Any CSS colour: this is what the chip is painted with. */
  colour: string;
  /** Printed under the name — a paint code, a shade number. */
  code?: string;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export function SwatchFanDeck({
  swatches,
  value,
  defaultValue,
  onChange,
  spread = 14,
  chipWidth = 64,
  chipHeight = 150,
  label = "Colour",
  paper = "#f7f5f0",
  ink = "#0e0e0c",
  className = "",
}: {
  swatches: Swatch[];
  /** Controlled: the selected swatch's colour. */
  value?: string;
  defaultValue?: string;
  onChange?: (swatch: Swatch) => void;
  /** Degrees between neighbouring chips when fanned. */
  spread?: number;
  chipWidth?: number;
  chipHeight?: number;
  /** Accessible name for the group. */
  label?: string;
  /** The chip's card stock. */
  paper?: string;
  ink?: string;
  className?: string;
}) {
  const [inner, setInner] = useState(defaultValue ?? swatches[0]?.colour ?? "");
  const [open, setOpen] = useState(false);
  const selected = value ?? inner;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const n = swatches.length;
  const mid = (n - 1) / 2;
  const pivot = chipHeight + 56; // rotation radius, from the chip's top edge
  const maxAngle = (Math.abs(mid * spread) * Math.PI) / 180;
  const boxW = Math.ceil(2 * pivot * Math.sin(maxAngle) + chipWidth + 12);
  const boxH = Math.ceil(chipHeight + pivot * (1 - Math.cos(maxAngle)) + 8);

  const current = swatches.find((s) => s.colour === selected) ?? swatches[0];

  function choose(i: number) {
    const s = swatches[i];
    if (!s) return;
    setInner(s.colour);
    onChange?.(s);
    buttons.current[i]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const i = Math.max(
      0,
      swatches.findIndex((s) => s.colour === selected),
    );
    let j = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + n) % n;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = n - 1;
    else return;
    e.preventDefault();
    choose(j);
  }

  return (
    <div
      className={"inline-flex flex-col items-center " + className}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div
        role="radiogroup"
        aria-label={label}
        data-fan-deck=""
        onKeyDown={onKeyDown}
        className="relative"
        style={{ width: boxW, height: boxH }}
      >
        {swatches.map((s, i) => {
          const isSelected = s.colour === selected;
          // Closed: a 1.6° fan so the stack reads as a deck rather than one chip.
          const angle = (i - mid) * (open ? spread : 1.6);
          const lift = open && isSelected ? -16 : 0;
          return (
            <button
              key={s.colour + "-" + i}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={s.code ? s.name + ", " + s.code : s.name}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => choose(i)}
              className="absolute top-0 left-1/2 flex flex-col overflow-hidden rounded-[3px] text-left outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                width: chipWidth,
                height: chipHeight,
                marginLeft: -chipWidth / 2,
                background: paper,
                color: ink,
                boxShadow: isSelected && open
                  ? "0 14px 28px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.08)"
                  : "0 2px 4px -2px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08)",
                transform: "rotate(" + angle + "deg) translateY(" + lift + "px)",
                transformOrigin: "50% " + pivot + "px",
                transition:
                  "transform 620ms " + EASE + ", box-shadow 620ms " + EASE,
                zIndex: isSelected ? n + 1 : i,
              }}
            >
              <span aria-hidden="true" className="relative m-1 block flex-1 rounded-[2px]" style={{ background: s.colour }}>
                {/* The punch hole for the ring. */}
                <span
                  className="absolute top-1.5 left-1/2 size-2 -translate-x-1/2 rounded-full"
                  style={{ background: "rgba(0,0,0,0.5)", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.6)" }}
                />
              </span>
              <span aria-hidden="true" className="block px-1.5 pt-0.5 pb-1.5 font-mono text-[9px] leading-[1.2] tracking-[0.06em] uppercase">
                <span className="block truncate">{s.name}</span>
                {s.code && <span className="block opacity-60">{s.code}</span>}
              </span>
            </button>
          );
        })}
        {/* Static text only; no prop reaches this style element. */}
        <style>{"@media (prefers-reduced-motion: reduce){[data-fan-deck] > button{transition:none!important}}"}</style>
      </div>

      {current && (
        <p className="mt-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.04em]" aria-live="polite">
          <span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={{ background: current.colour }} />
          <span>{current.name}</span>
          {current.code && <span className="opacity-60">{current.code}</span>}
        </p>
      )}
    </div>
  );
}
