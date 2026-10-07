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
      <p className="text-[0.625rem] font-extrabold tracking-wide text-upay-navy uppercase">
        Ready-to-send message
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {drafts.map((draft) => {
          const text = draft.template.replace("{url}", `${origin}${eventPath}`);
          return (
            <div
              key={draft.language}
              className="flex flex-col gap-2 rounded-2xl border border-white/80 bg-white/80 p-3.5 shadow-chip"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-upay-navy">{draft.label}</span>
                <button
                  type="button"
                  onClick={() => copy(draft.language, text)}
                  className="rounded-lg bg-upay-blue-soft px-2.5 py-1 text-xs font-bold text-upay-blue transition-colors hover:bg-upay-yellow hover:text-upay-navy"
                >
                  {copied === draft.language ? "Copied" : "Copy"}
                </button>
              </div>
              <p
                lang={draft.language}
                className="text-sm leading-relaxed whitespace-pre-line text-upay-navy/80"
              >
                {text}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-xs font-medium text-upay-navy/50">
        Generated from fixed templates and this event&apos;s details. Review before sending; nothing is
        sent automatically.
      </p>
    </div>
  );
}
