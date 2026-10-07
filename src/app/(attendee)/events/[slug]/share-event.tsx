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
    "flex-1 rounded-xl bg-upay-blue-soft px-2 py-2 text-center text-xs font-bold whitespace-nowrap text-upay-blue transition-colors hover:bg-upay-yellow hover:text-upay-navy";

  return (
    <div className="flex flex-col gap-2 border-t border-upay-blue/8 pt-4">
      <p className="text-xs font-extrabold text-upay-navy">Invite friends</p>
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
