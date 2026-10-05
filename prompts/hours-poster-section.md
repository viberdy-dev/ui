# Hours Poster Section: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Hours Poster Section** from scratch, or edit it first to restyle it. The finished code is [components/hours-poster-section.tsx](../components/hours-poster-section.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/hours-poster-section?ref=github).

````text
Create a React + Tailwind (v4) component named HoursPoster: a small business's opening hours set as a typographic poster, with today's row highlighted and a live "Open now / Closed" status computed on the shop's own clock.

Data: `days`, an array of seven entries Monday first, each { ranges?: [string, string][] (open/close as "HH:MM", 24-hour; none = closed; a close at or before its open runs overnight), note?: string }. Other props: timeZone (IANA, default "Europe/London"), title, phone (rendered as a tel: link with non-digits stripped), note (small print), accent, paper, ink (hex only, validated with a regex and defaulted), hour12 (boolean), today (number 0–6 to force the highlighted row for tests and screenshots), className.

Look (the section is a `@container`; use @3xl: variants for the wide layout):
- Paper ground, ink text. Top row: the title in 11px uppercase monospace with 0.18em tracking on the left; the status on the right in the same style, with a 6px dot before it (accent when open, ink at 35% when closed), aria-live="polite".
- Seven rows of FIXED height (64px, 72px wide), separated by hairlines set inline as rgba(ink, 0.14). Each row: the day as two-letter caps ("Mo" … "Su") at 52px / 66px wide, font-black, tracking -0.06em, leading 1, with a NEGATIVE left margin of -0.09em so the letter hangs off the section's left edge (the section is overflow-hidden); the hours in 14px / 16px tabular monospace as "09:00 – 18:00", multiple ranges joined with " · "; the note on the right in 11px uppercase monospace at 60% opacity, hidden on narrow containers.
- A closed row shows "Closed" and a 2px rule struck across the WHOLE row at mid-height.
- Today's row is the only place the accent appears: a full-width band with paper-coloured text, and aria-current="date". Each row starts with a visually hidden full day name for screen readers, and the two-letter day is aria-hidden.
- A bottom bar: small print left, the phone link right, in monospace caps.

The clock:
- Never render the time on the server. Use useSyncExternalStore with a module-level minute store: server snapshot 0 (no row is today, the status shows an ellipsis), client snapshot Math.floor(Date.now() / 60000). The subscribe function ticks immediately, then re-arms a setTimeout aimed 50ms past the next minute boundary, and also ticks on visibilitychange when the tab becomes visible.
- Convert the minute to the shop's weekday and minute-of-day with Intl.DateTimeFormat in `timeZone` (weekday short, hour and minute 2-digit, hourCycle "h23", formatToParts). Catch the RangeError from an invalid zone and treat it as unknown.
- Status: flatten every range into minutes since Monday 00:00 (add 1440 to a close that is not after its open); if now falls inside a span (also test now + 7 days for Sunday-night spans that run into Monday) show "Open now · closes HH:MM"; otherwise find the nearest future span (modulo the week) and show "Closed · opens today 09:00" / "tomorrow 09:00" / "Thursday 09:00". With no ranges at all show "By appointment".

Output one self-contained "use client" component with no dependencies beyond React, exporting the DayHours type.
````
