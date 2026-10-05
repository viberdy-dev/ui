"use client";

import type { ReactNode } from "react";

export function CrtScanlineOverlay({
  children,
  lineGap = 3,
  intensity = 30,
  roll = true,
  rollSeconds = 12,
  grille = true,
}: {
  children: ReactNode;
  lineGap?: number;
  intensity?: number;
  roll?: boolean;
  /** Seconds for one pass of the refresh bar. Lower is faster and more agitated. */
  rollSeconds?: number;
  /** Vertical RGB triads. This is what reads as a tube rather than stripes. */
  grille?: boolean;
}) {
  const opacity = intensity / 100;

  return (
    <div className="relative isolate overflow-hidden">
      {/* Static keyframes — nothing interpolated in here. */}
      <style>{"@keyframes crt-roll { 0% { transform: translateY(-100%); } 100% { transform: translateY(240%); } } @media (prefers-reduced-motion: reduce) { [data-crt-roll] { animation: none !important; } }"}</style>

      {children}

      {/* Horizontal scanlines. A repeating gradient, not an image: a few
          hundred bytes, resolution-independent, crisp on retina. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(0,0,0," +
            opacity +
            ") 0px, rgba(0,0,0," +
            opacity +
            ") 1px, transparent 1px, transparent " +
            lineGap +
            "px)",
        }}
      />

      {/* Aperture grille: vertical RGB triads. This is the layer that makes it
          read as a real tube rather than as generic stripes. */}
      {grille && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, rgba(255,0,0,0.10) 0px, rgba(0,255,0,0.10) 1px, rgba(0,0,255,0.10) 2px, transparent 3px)",
          }}
        />
      )}

      {roll && (
        <div
          aria-hidden
          data-crt-roll=""
          className="pointer-events-none absolute inset-x-0 h-16"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(255,255,255,0.05), transparent)",
            animation: "crt-roll " + Math.max(1, rollSeconds) + "s linear infinite",
          }}
        />
      )}

      {/* Tubes are darker at the corners. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
