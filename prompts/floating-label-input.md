# Floating Label Input: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **Floating Label Input** from scratch, or edit it first to restyle it. The finished code is [components/floating-label-input.tsx](../components/floating-label-input.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/floating-label-input?ref=github).

````text
Create a React + Tailwind "floating label input" component named FloatingLabelInput.

Behavior:
- A text input with an absolutely-positioned <label> layered on top of it, vertically centered inside the field by default (so it reads like a placeholder sitting inside the box) rather than sitting above the input like a normal form label.
- Track focus (onFocus/onBlur) and the input's own value in state. When either the field is focused OR has a non-empty value, the label should be considered "floated".
- Floated state moves the label up and shrinks it into a small caption hovering above the input's top border, via conditional Tailwind classes (translate-y and scale, both applied through className, not inline style) plus a CSS `transition-all` on the label so the move+shrink interpolates smoothly — a uniform translate+scale like this doesn't need Framer Motion, a plain CSS transition already animates it correctly.
- Label color changes to the brand/focus color while focused, back to muted otherwise.
- Associate label and input properly via a shared id from React's useId() (not a hardcoded string, so multiple instances on one page don't collide) and htmlFor.
- Props: label, type (input type: text/email/password/etc).

Style: rounded bordered input, label starts as vertically-centered placeholder-style text, floats to a small caption above the border on focus/fill, brand-colored border and label on focus.

Output a single self-contained "use client" component.
````
