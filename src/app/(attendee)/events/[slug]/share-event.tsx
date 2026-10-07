"use client";

import { useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Lets an attendee promote the event to friends on WhatsApp and Facebook, the
 * two channels Bangladeshi student clubs actually use. The link opens the
 * event page, where registration and payment run through upay.
 */
export function ShareEvent({ slug, title, when }: { slug: string; title: string; when: string }) {
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  const [copied, setCopied] = useState(false);

  const url = `${origin}/events/${slug}`;
  const message = `Join me at ${title} (${when}). Register and pay with upay: ${url}`;

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const buttonClass =
    "flex-1 rounded-md border border-border px-2 py-2 text-center text-xs font-medium whitespace-nowrap hover:bg-muted";

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <p className="text-xs font-medium">Invite friends</p>
      <div className="flex gap-2">
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          WhatsApp
        </a>
        <a href={facebook} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          Facebook
        </a>
        <button type="button" onClick={copyLink} className={buttonClass}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
