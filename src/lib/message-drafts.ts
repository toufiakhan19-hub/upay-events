import type { RecommendationActionType } from "@/db/enums";

/**
 * Ready-to-send Bangla and English messages for the AI's recommended action.
 *
 * Built from fixed templates and the event's own details, so every word is
 * reviewable and no personal data or external service is involved. `{url}` is
 * replaced in the browser with the absolute event link.
 */

const DHAKA_TIME_ZONE = "Asia/Dhaka";

const banglaDate = new Intl.DateTimeFormat("bn-BD", {
  timeZone: DHAKA_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const banglaClock = new Intl.DateTimeFormat("bn-BD", {
  timeZone: DHAKA_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h12",
});

const dhakaHour = new Intl.DateTimeFormat("en-US", {
  timeZone: DHAKA_TIME_ZONE,
  hour: "numeric",
  hourCycle: "h23",
});

/** e.g. `সকাল ১০:০০`: Bangla digits with a time-of-day word instead of AM/PM. */
function formatBanglaTime(date: Date): string {
  const hour = Number(dhakaHour.format(date));
  const period =
    hour < 4 ? "রাত" : hour < 6 ? "ভোর" : hour < 12 ? "সকাল" : hour < 15 ? "দুপুর" : hour < 18 ? "বিকাল" : hour < 20 ? "সন্ধ্যা" : "রাত";
  const clock = banglaClock
    .formatToParts(date)
    .filter((part) => part.type === "hour" || part.type === "minute" || part.type === "literal")
    .map((part) => part.value)
    .join("")
    .trim();
  return `${period} ${clock}`;
}

const englishDate = new Intl.DateTimeFormat("en-US", {
  timeZone: DHAKA_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const englishTime = new Intl.DateTimeFormat("en-US", {
  timeZone: DHAKA_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export type MessageDraft = {
  language: "bn" | "en";
  label: string;
  template: string;
};

export type MessageDraftEvent = {
  title: string;
  venue: string;
  dateTime: string;
};

export function messageDrafts(
  actionType: RecommendationActionType,
  event: MessageDraftEvent,
): MessageDraft[] | null {
  const when = new Date(event.dateTime);
  if (Number.isNaN(when.getTime())) {
    return null;
  }

  const bnDate = banglaDate.format(when);
  const bnTime = formatBanglaTime(when);
  const enDate = englishDate.format(when);
  const enTime = englishTime.format(when);

  if (actionType === "send_reminder") {
    return [
      {
        language: "bn",
        label: "Bangla reminder",
        template:
          `প্রিয় অংশগ্রহণকারী, "${event.title}" অনুষ্ঠিত হবে ${bnDate}, ${bnTime}-এ, ${event.venue}। ` +
          "আপনি কি আসছেন? অনুগ্রহ করে আপনার উপস্থিতি নিশ্চিত করুন। প্রবেশের সময় আপনার upay টিকিটের QR কোড দেখান। " +
          "আসতে না পারলে আমাদের জানান, যাতে অপেক্ষমাণ কেউ আপনার আসনটি পেতে পারেন।",
      },
      {
        language: "en",
        label: "English reminder",
        template:
          `Hi! "${event.title}" is on ${enDate} at ${enTime}, ${event.venue}. ` +
          "Are you coming? Please confirm your attendance, and show the QR code on your upay ticket at the entrance. " +
          "If you can't make it, let us know so someone on the waitlist can take your seat.",
      },
    ];
  }

  if (actionType === "target_segment") {
    return [
      {
        language: "bn",
        label: "Bangla announcement",
        template:
          `"${event.title}" — ${bnDate}, ${bnTime}, ${event.venue}। ` +
          "আসন সীমিত! এখনই রেজিস্টার করুন এবং upay দিয়ে পেমেন্ট করুন: {url}",
      },
      {
        language: "en",
        label: "English announcement",
        template:
          `"${event.title}" — ${enDate}, ${enTime} at ${event.venue}. ` +
          "Seats are limited! Register now and pay with upay: {url}",
      },
    ];
  }

  return null;
}
