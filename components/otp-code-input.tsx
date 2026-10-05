"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";

export function OtpCodeInput({
  length = 6,
  label = "Verification code",
  grouped = true,
  onComplete,
}: {
  length?: number;
  label?: string;
  grouped?: boolean;
  onComplete?: (code: string) => void;
}) {
  const [stored, setStored] = useState<string[]>([]);
  const cells = useRef<Array<HTMLInputElement | null>>([]);
  const groupRef = useRef<HTMLDivElement>(null);
  // The CODE that was last reported, not a boolean. A boolean guard looks
  // equivalent and is not — see the note in commit().
  const firedFor = useRef<string | null>(null);

  // DERIVED, not held at a fixed size. Storing a fixed-length array means a
  // change to the length prop leaves the array and the rendered cells
  // disagreeing, which shows up later as an off-by-one in the submitted code.
  const digits = Array.from({ length }, (_, i) => stored[i] ?? "");

  const focusCell = useCallback(
    (i: number) => {
      const el = cells.current[Math.max(0, Math.min(length - 1, i))];
      el?.focus();
      // Select, do not merely focus. A cell with maxLength=1 that already
      // holds a digit REJECTS further input, so without this the user cannot
      // overtype a digit they got wrong — they can only delete it first.
      el?.select();
    },
    [length],
  );

  const commit = useCallback(
    (next: string[]) => {
      const trimmed = next.slice(0, length);
      setStored(trimmed);
      const value = trimmed.join("");
      if (value.length === length) {
        // Fire once per DISTINCT completed code.
        //
        // A boolean "have I fired yet" guard is the obvious version and it is
        // wrong. Select-on-focus exists so a wrong digit can be overtyped
        // without deleting it first — and an overtype never takes the row
        // below full, so a boolean guard is never reset and the CORRECTED
        // code is silently never reported. The user sees a filled, plausible
        // field and the parent never hears about it. Comparing against the
        // last reported value fires on the correction and still cannot
        // double-fire on a keystroke that changes nothing.
        if (firedFor.current !== value) {
          firedFor.current = value;
          onComplete?.(value);
        }
      } else {
        firedFor.current = null;
      }
    },
    [length, onComplete],
  );

  // ONE path for every source of characters: typing, pasting, and the OS
  // filling a code from SMS. Autofill IGNORES maxLength, so a six-digit code
  // genuinely arrives as a single six-character change event on one cell.
  const write = useCallback(
    (at: number, raw: string) => {
      const chars = raw.replace(/[^0-9]/g, "").split("");
      if (chars.length === 0) return;
      const next = digits.slice();
      let i = at;
      for (const ch of chars) {
        if (i >= length) break;
        next[i] = ch;
        i += 1;
      }
      commit(next);
      focusCell(i);
    },
    [digits, length, commit, focusCell],
  );

  const clearAt = useCallback(
    (i: number) => {
      const next = digits.slice();
      if (next[i]) {
        next[i] = "";
        commit(next);
      } else if (i > 0) {
        // Backspace in an empty cell deletes the digit BEFORE it and moves
        // back, which is what every native field does.
        next[i - 1] = "";
        commit(next);
        focusCell(i - 1);
      }
    },
    [digits, commit, focusCell],
  );

  // Held in a ref so the native listener below is registered ONCE rather than
  // being torn down and rebuilt on every keystroke.
  const clearRef = useRef(clearAt);
  useEffect(() => {
    clearRef.current = clearAt;
  }, [clearAt]);

  useEffect(() => {
    const host = groupRef.current;
    if (!host) return;
    // A NATIVE listener, delegated on the group.
    //
    // React's onBeforeInput PROP IS NOT THE NATIVE beforeinput EVENT. It is a
    // legacy synthetic event assembled from keypress, textInput and
    // composition events, and it never fires for a deletion — a component that
    // relies on it has no Android backspace handling at all, silently.
    const onBeforeInput = (e: Event) => {
      if ((e as InputEvent).inputType !== "deleteContentBackward") return;
      const i = cells.current.indexOf(e.target as HTMLInputElement);
      if (i < 0) return;
      e.preventDefault();
      clearRef.current(i);
    };
    host.addEventListener("beforeinput", onBeforeInput);
    return () => host.removeEventListener("beforeinput", onBeforeInput);
  }, []);

  return (
    <div className="w-[300px]">
      <p className="mb-3 text-[12px] font-medium text-white/80">{label}</p>

      <div
        ref={groupRef}
        role="group"
        aria-label={label}
        className="flex items-center gap-1.5"
      >
        {digits.map((d, i) => (
          <Fragment key={i}>
            {grouped && i === Math.floor(length / 2) && (
              <span aria-hidden className="mx-1 h-px w-3 shrink-0 bg-white/20" />
            )}
            <input
              ref={(el) => {
                cells.current[i] = el;
              }}
              // NOT type="number": it draws spinners, ignores maxLength, and
              // accepts "e", "+" and "-". text + inputMode is the right pair.
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={d}
              aria-label={"Digit " + (i + 1) + " of " + length}
              onChange={(e) => write(i, e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onPaste={(e) => {
                e.preventDefault();
                write(i, e.clipboardData.getData("text"));
              }}
              onKeyDown={(e) => {
                if (e.key === "Backspace") {
                  // Desktop path. preventDefault here also suppresses the
                  // beforeinput that would otherwise follow, so the native
                  // listener above cannot double-fire on the same press.
                  e.preventDefault();
                  clearAt(i);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  focusCell(i - 1);
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  focusCell(i + 1);
                }
              }}
              className="h-12 min-w-0 flex-1 rounded-md border bg-transparent text-center font-mono text-[17px] tabular-nums text-white outline-none transition-colors focus:border-white/45"
              style={{
                borderColor: d ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.10)",
                background: d ? "rgba(255,255,255,0.04)" : "transparent",
              }}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
