# Punch Card Field: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Punch Card Field** from scratch, or edit it first to restyle it. The finished code is [components/punch-card-field.tsx](../components/punch-card-field.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/punch-card-field?ref=github).

````text
Create a React + Tailwind background, PunchCardField: a neo-brutalist field of 80-column punch cards whose holes spell real text in Hollerith code, with children rendered on top.

Props (export PunchCardFieldProps): lines (one line per card, up to 80 characters, repeating to fill the field), count (cards, 1-24, default 9), cardWidth (px, 320-900, default 560), tilt (-8 to 8 degrees, default -5), punchIn (default true), decoder (default true), ground (behind the cards: yellow #ffd23f default, coral #ff6b6b, blue #74b9ff, lime #b4f462, pink #ff5fa2, "ink", "cream" #fffdf5, or a regex-validated hex; own-key lookup), ink (#000), children (rendered above the field in a layer with pointer-events none whose direct children take pointer events back, so the decoder works around them), className (give it a height). Clamp numbers and fall back on NaN.

The code: twelve rows top to bottom 12, 11, 0, 1-9. Digits punch their own row; A-I punch 12 plus 1-9; J-R punch 11 plus 1-9; S-Z punch 0 plus 2-9; symbols from the IBM 029 table (& 12, - 11, / 0-1, . 12-3-8, , 0-3-8, : 2-8, ' 5-8, # 3-8, @ 4-8, ? 0-7-8, ! 11-2-8, ( 12-5-8, ) 11-5-8, + 12-6-8, = 6-8, * 11-4-8, $ 11-3-8, % 0-4-8); a space or anything unknown punches nothing. Look the symbol table up by own key.

Each card is one SVG (viewBox units: columns 10 apart from x 30, rows 28 apart from y 46, so 860 x 400): a cream #fffdf5 body with its top-left corner cut at 45 degrees, a 3px ink border (miter joins) and a copy of the shape in ink offset 5,5 as the hard shadow; the printed digits 0-9 in rows 0-9 of every column drawn as ONE rect filled with a pattern (one column wide, ten digits in mono at 42% ink), defined once in a hidden SVG with a useId-based id stripped to alphanumerics; the typed line along the top edge as ONE text element with a list of x positions (one per column, spaces as non-breaking spaces from String.fromCharCode(160)); a mono "CARD 001" at the bottom right; and the punched positions as 5.5 x 15 ink rects. Lay the cards in a CSS grid (auto-fill, minmax(cardWidth, 1fr), 40px and 36px gaps) wider than the field (max(170%, cardWidth x 3.4)), centred and rotated by tilt, absolutely filling the container behind the children (isolate, overflow hidden, -z-10, aria-hidden, the grid itself takes pointer events).

Punch-in: each hole has a 1ms steps(1, end) animation from visibility hidden with fill backwards and a delay of card index x 90ms plus column x 8ms, so the punch head crosses each card; only under prefers-reduced-motion: no-preference; nothing moves afterwards.

Decoder: on pointer move or down over a card, map the pointer into card units with the SVG's getScreenCTM().inverse() (this goes through the tilt and any preview scaling), pick the column, and draw a 3px ink frame around that column's twelve rows plus an ink label above it reading "COL 17 · R · 11-9" (or "SPACE · no punch") in cream mono; clear on leave. Only update state when the card or column changes.

Output one self-contained "use client" TSX file with no dependencies beyond React. Build strings with + rather than template literals.
````
