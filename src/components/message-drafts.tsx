"use client";

import { useState, useSyncExternalStore } from "react";

import type { MessageDraft } from "@/lib/message-drafts";

const noopSubscribe = () => () => {};

/** Copyable Bangla and English drafts for the recommended reminder or announcement. */
export function MessageDrafts({ drafts, eventPath }: { drafts: MessageDraft[]; eventPath: string }) {
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(language: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(language);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Ready-to-send message
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {drafts.map((draft) => {
          const text = draft.template.replace("{url}", `${origin}${eventPath}`);
          return (
            <div
              key={draft.language}
              className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{draft.label}</span>
                <button
                  type="button"
                  onClick={() => copy(draft.language, text)}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                >
                  {copied === draft.language ? "Copied" : "Copy"}
                </button>
              </div>
              <p lang={draft.language} className="text-sm leading-relaxed whitespace-pre-line">
                {text}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Generated from fixed templates and this event&apos;s details. Review before sending; nothing is
        sent automatically.
      </p>
    </div>
  );
}
