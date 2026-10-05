# Fuzzy Match Input: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Fuzzy Match Input** from scratch, or edit it first to restyle it. The finished code is [components/fuzzy-match-input.tsx](../components/fuzzy-match-input.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/fuzzy-match-input?ref=github).

````text
Create a React + Tailwind component named FuzzyMatchInput — a search field that fuzzy-matches by subsequence and highlights exactly which characters matched.

The matcher is the component. Write fuzzyMatch(query, target) that:
- Walks the query characters in order, advancing a pointer through the target. If a query character cannot be found in the remaining target, return null (no match).
- Returns { indices, score } — the INDICES of the matched characters as well as a score. Returning only a boolean is why most fuzzy search fields cannot highlight what matched; the indices are what make the highlight possible.
- Scores with two bonuses: consecutive matches are worth far more than scattered ones (track a run counter and add run * 4), and matches at a word start (index 0, or preceded by a space or hyphen) get a flat bonus. So "cmd" should rank "Command Menu" above a string that merely contains c, m and d scattered through it.
- Skips spaces in the query.

The UI:
- An input, then a list of matching rows sorted by score descending and capped at `limit`.
- Render each row character by character, styling characters whose index is in `indices` with the accent color and a heavier weight.
- Memoize the filtered/sorted results with useMemo keyed on the query.

Props: rows (string[]), limit (number), placeholder (string).

Output a single self-contained "use client" component, exporting fuzzyMatch as well.
````
