"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyCodeSnippet({
  code = "npx shadcn@latest add viberdy-dev/ui/copy-code-snippet",
  language = "bash",
}: {
  code?: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-red-400"
        >
          {copied ? (
            <>
              <Check size={12} className="text-red-400" />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-neutral-100">{code}</pre>
    </div>
  );
}
