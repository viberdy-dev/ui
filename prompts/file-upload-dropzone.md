# File Upload Dropzone: AI prompt

Paste this into Cursor, Claude Code, v0, Lovable or Bolt to generate **File Upload Dropzone** from scratch, or edit it first to restyle it. The finished code is [components/file-upload-dropzone.tsx](../components/file-upload-dropzone.tsx); the live demo is on [viberdy.dev](https://viberdy.dev/library/file-upload-dropzone?ref=github).

````text
Create a React + Tailwind + Framer Motion "file upload dropzone" component named FileUploadDropzone.

Behavior:
- A dashed-border drop target wrapping a visually-hidden real <input type="file" multiple>, so it's a genuine, accessible file input, not a fake decorative box — label wraps the hidden input so clicking anywhere in the zone opens the OS file picker.
- Track a `dragging` boolean via onDragOver (preventDefault + setDragging(true)) / onDragLeave (setDragging(false)) / onDrop (preventDefault, setDragging(false), read e.dataTransfer.files). While dragging, animate the icon with a small upward lift + scale via Framer Motion, and swap the border/background to an accent color.
- Selected/dropped files render as an animated list below the zone (AnimatePresence, slide+fade in, height animates too so removal doesn't jump-cut), each with a remove button.
- ENFORCE what the hint claims. Take `accept` (extensions) and `maxBytes`, filter both dropped and picked files against them, and set the real `accept` attribute on the input. A dropzone whose caption promises a limit while the handler accepts anything teaches the copier that the constraint is handled when it is not. Note in a comment that this is a UX gate and the server must validate independently.
- Props: hint, accept (string[]), maxBytes (number), onFiles (callback fired with the newly added File[]).

Style: rounded dashed border, muted icon and hint text that go accent-colored specifically while a drag is over the zone, small file chips below.

Output a single self-contained "use client" component.
````
