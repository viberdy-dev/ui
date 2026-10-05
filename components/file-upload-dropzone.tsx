"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud, FileText, X } from "lucide-react";

export function FileUploadDropzone({
  hint = "PNG, PDF up to 10MB",
  accept = [".png", ".pdf"],
  maxMb = 10,
  maxBytes,
  onFiles,
}: {
  hint?: string;
  /** Extensions actually enforced. Keep this in step with `hint`. */
  accept?: string[];
  /** Size ceiling in megabytes. Keep this in step with the hint. */
  maxMb?: number;
  /** Exact byte ceiling. Overrides maxMb when given. */
  maxBytes?: number;
  onFiles?: (files: File[]) => void;
}) {
  const sizeLimit = maxBytes ?? maxMb * 1024 * 1024;
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    // The hint states a limit, so the component enforces one. A dropzone whose
    // caption claims "PNG, PDF up to 10MB" while accepting a 2GB .exe teaches
    // the copier that the constraint is handled when it is not. Client-side
    // checks are a UX gate, never a security boundary — validate on the server
    // too, since anything here can be bypassed.
    const next = Array.from(list).filter(
      (f) => f.size <= sizeLimit && (!accept.length || accept.some((t) => f.name.toLowerCase().endsWith(t))),
    );
    if (!next.length) return;
    setFiles((prev) => [...prev, ...next]);
    onFiles?.(next);
  }

  return (
    <div className="w-full max-w-sm">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-red-500 bg-red-50" : "border-neutral-200 hover:border-neutral-400"
        }`}
      >
        <input
          type="file"
          multiple
          accept={accept.join(",")}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <motion.div animate={{ y: dragging ? -3 : 0, scale: dragging ? 1.08 : 1 }}>
          <UploadCloud size={26} className={dragging ? "text-red-500" : "text-neutral-400"} />
        </motion.div>
        <p className="text-sm font-medium">{dragging ? "Drop it here" : "Drag files or click to browse"}</p>
        <p className="text-xs text-neutral-400">{hint}</p>
      </label>

      {files.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {files.map((file, i) => (
              <motion.li
                key={`${file.name}-${i}`}
                initial={{ opacity: 0, x: -8, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 8, height: 0 }}
                className="flex items-center gap-2 overflow-hidden rounded-lg border border-neutral-200 px-3 py-2 text-xs"
              >
                <FileText size={13} className="shrink-0 text-neutral-400" />
                <span className="flex-1 truncate">{file.name}</span>
                <button
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 text-neutral-400 hover:text-red-500"
                >
                  <X size={13} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
