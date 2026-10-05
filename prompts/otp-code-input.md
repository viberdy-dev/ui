# OTP Code Input: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **OTP Code Input** from scratch, or edit it first to restyle it. The finished code is [components/otp-code-input.tsx](../components/otp-code-input.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/otp-code-input?ref=github).

````text
Build a one-time-code (OTP) input in React + Tailwind named OtpCodeInput — N single-character cells that behave like one field.

Most OTP implementations are broken in the same four ways. Handle all of them:

1. AUTOFILL IGNORES maxLength. When iOS or Android offers a code from SMS it sets ONE input's value to the whole code, even though every cell is `maxLength={1}`. So the `onChange` handler and the `onPaste` handler must be the SAME function: strip non-digits from the incoming string and distribute the characters across the cells from the current index forward. Put `autoComplete="one-time-code"` on every cell — it is safe precisely because the handler distributes.

2. A FULL CELL REJECTS INPUT. With `maxLength={1}` and a digit already present, typing does nothing — the user cannot correct a wrong digit, only delete it first. On every focus call `e.currentTarget.select()` so the next keystroke replaces the contents.

3. ANDROID DOES NOT REPORT Backspace THROUGH keydown. Soft keyboards send keyCode 229 / `key === "Unidentified"`, so a keydown-only delete handler is dead on most phones. The signal that does arrive is the native `beforeinput` event with `inputType === "deleteContentBackward"`.

   REACT'S `onBeforeInput` PROP IS NOT THAT EVENT. It is a legacy synthetic event assembled from keypress, textInput and composition events, and it NEVER fires for a deletion — wire it up and the Android path is silently dead. Attach a real listener instead: `host.addEventListener("beforeinput", handler)` on the group, delegated, and find the cell with `cells.indexOf(e.target)`. Hold the handler in a ref synced from an effect so the listener registers once rather than being rebuilt on every keystroke.

   Keep the keydown handler for desktop — because it calls `preventDefault()`, no `beforeinput` follows there, so the two cannot double-fire.

4. `type="number"` LOOKS RIGHT AND IS WRONG — spinners, ignored maxLength, and it accepts "e", "+" and "-". Use `type="text"` with `inputMode="numeric"`.

Also:
- DERIVE the digit array from stored state at the current length (`Array.from({ length }, (_, i) => stored[i] ?? "")`) rather than holding a fixed-size array. A length change otherwise leaves the array and the cells disagreeing.
- Backspace in an EMPTY cell clears the previous cell and moves back, matching native behaviour.
- ArrowLeft / ArrowRight move between cells.
- Fire `onComplete` ONCE per completed code, guarded by a ref, and reset the guard when the code becomes incomplete again — otherwise correcting a digit submits twice.
- Give the wrapper `role="group"` with the field label, and every cell an aria-label like "Digit 3 of 6", so the field is navigable and announced without reference to the visual grouping.

Props: length, label, grouped (a hairline separator at the midpoint), onComplete.

Output a single self-contained "use client" component.
````
