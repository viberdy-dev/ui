"use client";

import { useMemo, useState } from "react";

type Match = { indices: number[]; score: number } | null;

/**
 * Subsequence matcher. Returns the matched INDICES as well as a score —
 * returning only a boolean is why most "fuzzy search" fields cannot highlight
 * what actually matched.
 */
export function fuzzyMatch(query: string, target: string): Match {
  if (!query) return { indices: [], score: 0 };
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  const indices: number[] = [];
  let score = 0;
  let run = 0;
  let ti = 0;

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    if (ch === " ") continue;

    let found = -1;
    while (ti < t.length) {
      if (t[ti] === ch) {
        found = ti;
        break;
      }
      ti++;
    }
    if (found === -1) return null; // a query char is missing -> no match

    indices.push(found);
    // Consecutive hits are worth far more than scattered ones, so "cmd"
    // prefers a contiguous run over three letters spread across the string.
    run = indices.length > 1 && found === indices[indices.length - 2] + 1 ? run + 1 : 0;
    score += 1 + run * 4;
    // Word starts are a strong signal of intent.
    if (found === 0 || t[found - 1] === " " || t[found - 1] === "-") score += 6;
    ti = found + 1;
  }

  return { indices, score };
}

export function FuzzyMatchInput({
  rows,
  limit = 5,
  placeholder = "Search…",
  showScore = true,
}: {
  rows: string[];
  limit?: number;
  placeholder?: string;
  /** Print each row's match score, which makes the ranking legible. */
  showScore?: boolean;
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(
    () =>
      rows
        .map((row) => ({ row, match: fuzzyMatch(query, row) }))
        .filter((r): r is { row: string; match: NonNullable<Match> } => r.match !== null)
        .sort((a, b) => b.match.score - a.match.score)
        .slice(0, limit),
    [rows, query, limit]
  );

  return (
    <div className="overflow-hidden rounded-lg border border-white/15 bg-neutral-950">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        className="w-full border-b border-white/10 bg-transparent px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-white/40"
      />

      <ul className="max-h-60 overflow-y-auto py-1">
        {results.map(({ row, match }) => (
          <li
            key={row}
            className="flex items-baseline justify-between gap-3 px-3 py-1.5 text-[13px] text-white/60"
          >
            <span>
              {row.split("").map((ch, i) => (
                <span
                  key={i}
                  className={match.indices.includes(i) ? "font-semibold text-blue-400" : undefined}
                >
                  {ch}
                </span>
              ))}
            </span>
            {showScore && (
              <span className="shrink-0 font-mono text-[10px] text-white/40">{match.score}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
