"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  formatCount,
  formatDecimal,
  formatPercent,
  formatTimestamp,
} from "@/lib/format";
import type { CheckInScanOutcome } from "@/server/checkin/checkin";
import type { CheckInLiveState } from "@/server/checkin/queries";

import { QrScanner } from "./qr-scanner";

/**
 * The organizer/staff check-in screen (PRD §10 "Check-in view": QR scanner or
 * manual ticket-ID input, validated once, clear valid / already-used / invalid
 * status, live attendance count).
 *
 * Everything that decides anything happens on the server. The browser sends a
 * ticket token or a ticket id, and renders one of the three answers
 * `CHECK_IN_RESULTS` already defines. It never decides for itself whether a
 * ticket is valid, and it never sends an event id — the event comes from the
 * organizer session and the ticket.
 *
 * Manual entry is a peer of the camera, not a fallback hidden behind it: the
 * camera is one button, its failure paths all land back here, and a demo on a
 * laptop with no camera loses nothing.
 */

const SCAN_ENDPOINT = "/api/checkin/scan";
const LIVE_ENDPOINT = "/api/checkin/live";

/** Live refresh cadence. Short enough to look live, long enough not to hammer the database. */
const LIVE_REFRESH_MS = 10_000;

/** The three scan results plus the two request-level failures the console can show. */
type ConsoleStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "scanned"; outcome: CheckInScanOutcome }
  | { kind: "failed"; message: string };

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
  };
};

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;

    if (body.error?.message) {
      return body.error.request_id ? `${body.error.message} (${body.error.request_id})` : body.error.message;
    }
  } catch {
    // A non-JSON error body is still an error; fall through to the fallback.
  }

  return fallback;
}

/**
 * Live attendance next to the cached forecast.
 *
 * `null` comparison means no forecast has been persisted yet, so this says so
 * rather than comparing the count against a number nobody produced
 * (API_CONTRACT.md §7.3).
 */
function ForecastPanel({ state }: { state: CheckInLiveState }) {
  const { comparison, forecast } = state;

  if (!comparison || !forecast) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Forecast comparison
        </p>
        <p className="text-sm text-muted-foreground">
          No attendance forecast is cached for this event yet, so there is nothing to compare the
          live count against. The panel appears once the AI service writes a forecast — the live
          count above is real either way.
        </p>
      </div>
    );
  }

  const ahead = comparison.difference < 0;
  const onForecast = comparison.difference === 0;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Forecast comparison
      </p>

      <p className="text-sm">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {formatCount(comparison.checkedInAttendees)}
        </span>{" "}
        checked in against a predicted{" "}
        <span className="font-medium tabular-nums">
          {formatDecimal(comparison.predictedAttendance)}
        </span>{" "}
        attendees.
      </p>

      <p className="text-xs text-muted-foreground">
        {onForecast
          ? "Live attendance has landed exactly on the forecast."
          : ahead
            ? `${formatDecimal(Math.abs(comparison.difference))} more expected. Catering should still be planned for ${formatDecimal(comparison.predictedAttendance)}.`
            : `Attendance is ${formatDecimal(Math.abs(comparison.difference))} ahead of the forecast.`}{" "}
        Forecast cached {formatTimestamp(forecast.generatedAt)}
        {forecast.isStale ? " · marked stale, refresh the forecast for current numbers" : ""}.
      </p>
    </div>
  );
}

/** The one banner that reports the outcome of the last scan. */
function ResultBanner({
  status,
  eventId,
}: {
  status: ConsoleStatus;
  eventId: string;
}) {
  if (status.kind === "idle") {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Scan a ticket or type a ticket ID. Each ticket can be used once.
      </p>
    );
  }

  if (status.kind === "submitting") {
    return (
      <p
        role="status"
        className="rounded-xl border border-border bg-muted/40 p-4 text-sm font-medium"
      >
        Checking the ticket…
      </p>
    );
  }

  if (status.kind === "failed") {
    return (
      <p
        role="alert"
        className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
      >
        {status.message}
      </p>
    );
  }

  const { outcome } = status;
  const scannedForAnotherEvent = outcome.eventId !== null && outcome.eventId !== eventId;

  if (outcome.result === "checked_in") {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
      >
        <p className="text-base font-semibold">Checked in</p>
        <p className="text-sm">
          {outcome.ticketReference ? `Ticket ${outcome.ticketReference}` : "Ticket"}{" "}
          admitted at {formatTimestamp(outcome.checkedInAt ?? outcome.scannedAt)}.
        </p>
        {scannedForAnotherEvent ? (
          <p className="mt-1 text-sm">
            This ticket is for{" "}
            <span className="font-medium">{outcome.eventTitle}</span>, not the event on this screen.
          </p>
        ) : null}
      </div>
    );
  }

  if (outcome.result === "already_used") {
    return (
      <div
        role="status"
        className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
      >
        <p className="text-base font-semibold">Already checked in</p>
        <p className="text-sm">
          {outcome.ticketReference ? `Ticket ${outcome.ticketReference}` : "This ticket"} was already
          used
          {outcome.checkedInAt ? ` at ${formatTimestamp(outcome.checkedInAt)}` : ""}. Do not admit it
          a second time.
        </p>
        {scannedForAnotherEvent ? (
          <p className="mt-1 text-sm">
            It belongs to <span className="font-medium">{outcome.eventTitle}</span>.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="status"
      className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
    >
      <p className="text-base font-semibold">Invalid ticket</p>
      <p className="text-sm">
        No valid, unused ticket matched this code for your event. Check the attendee&apos;s ticket,
        or enter the ticket ID printed on it.
      </p>
    </div>
  );
}

export function CheckInConsole({
  eventId,
  eventTitle,
  initialState,
}: {
  eventId: string;
  eventTitle: string;
  /** Server-rendered so the counter is correct before any JavaScript runs. */
  initialState: CheckInLiveState;
}) {
  const [live, setLive] = useState<CheckInLiveState>(initialState);
  const [status, setStatus] = useState<ConsoleStatus>({ kind: "idle" });
  const [ticketIdInput, setTicketIdInput] = useState("");
  const [liveError, setLiveError] = useState<string | null>(null);

  const inFlightRef = useRef(false);

  const isSubmitting = status.kind === "submitting";

  /**
   * Refreshes the counter from the server rather than incrementing it locally.
   *
   * The server is the only source of attendance truth: a scan that was logged as
   * `already_used` must not move the number, and a rejected scan must not undo
   * someone else's count from another door. Polling the same read the dashboard
   * uses also keeps the console and the dashboard in step.
   */
  const refreshLive = useCallback(async () => {
    try {
      const response = await fetch(`${LIVE_ENDPOINT}?event_id=${encodeURIComponent(eventId)}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        setLiveError(await readErrorMessage(response, "Could not refresh the live count."));
        return;
      }

      setLive((await response.json()) as CheckInLiveState);
      setLiveError(null);
    } catch {
      setLiveError("Lost connection to the check-in service. The counter will retry.");
    }
  }, [eventId]);

  const submit = useCallback(
    async (payload: Record<string, string>) => {
      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      setStatus({ kind: "submitting" });

      try {
        const response = await fetch(SCAN_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          setStatus({
            kind: "failed",
            message: await readErrorMessage(
              response,
              "The check-in service rejected that scan. Try again.",
            ),
          });
          return;
        }

        setStatus({ kind: "scanned", outcome: (await response.json()) as CheckInScanOutcome });
      } catch {
        setStatus({
          kind: "failed",
          message: "Could not reach the check-in service. Check the connection and try again.",
        });
      } finally {
        inFlightRef.current = false;
        void refreshLive();
      }
    },
    [refreshLive],
  );

  // A camera scan submits exactly like the manual form does; only the field the
  // server matches against differs.
  const handleDetect = useCallback(
    (payload: string) => {
      void submit({ qr_token: payload });
    },
    [submit],
  );

  // Live attendance: poll while the tab is visible, and pause on a hidden tab so a
  // laptop left open overnight does not keep hitting the database.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !inFlightRef.current) {
        void refreshLive();
      }
    }, LIVE_REFRESH_MS);

    return () => clearInterval(timer);
  }, [refreshLive]);

  const handleManualSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = ticketIdInput.trim();

    if (value.length === 0) {
      return;
    }

    setTicketIdInput("");
    void submit({ ticket_id: value });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* A. Result of the last scan */}
      <ResultBanner status={status} eventId={eventId} />

      {/* B. Live attendance and the forecast comparison */}
      <section className="flex flex-col gap-4 rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight uppercase">Live attendance</h2>
          <p className="text-xs text-muted-foreground">
            {liveError ? liveError : "Refreshes every 10 seconds and after every scan."}
          </p>
        </div>

        <div className="flex items-end gap-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Checked in
            </p>
            <p className="text-4xl font-semibold tracking-tight tabular-nums">
              {formatCount(live.attendance.checkedInAttendees)}
            </p>
          </div>

          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Tickets issued</dt>
              <dd className="tabular-nums">{formatCount(live.attendance.ticketsIssued)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Paid registrations</dt>
              <dd className="tabular-nums">{formatCount(live.registrations.paidRegistrations)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Duplicates blocked</dt>
              <dd className="tabular-nums">{formatCount(live.attendance.duplicateScansRejected)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Attendance rate</dt>
              <dd className="tabular-nums">
                {live.attendance.attendanceRate === null
                  ? "Not available"
                  : formatPercent(live.attendance.attendanceRate)}
              </dd>
            </div>
          </dl>
        </div>

        {live.attendance.lastCheckInAt ? (
          <p className="text-xs text-muted-foreground">
            Last successful check-in {formatTimestamp(live.attendance.lastCheckInAt)}.
          </p>
        ) : null}

        <ForecastPanel state={live} />
      </section>

      {/* C. Scan and manual entry */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-tight uppercase">Scan a QR code</h2>
          <QrScanner onDetect={handleDetect} disabled={isSubmitting} />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-tight uppercase">
            Or enter a ticket ID
          </h2>

          <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
            <label htmlFor="ticket-id" className="text-sm">
              Ticket ID or reference
            </label>
            <input
              id="ticket-id"
              name="ticket_id"
              value={ticketIdInput}
              onChange={(event) => setTicketIdInput(event.target.value)}
              placeholder="01JQ8W7XK9M4N2P8Q3R6T5V1ZC"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={isSubmitting}
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-brand disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={isSubmitting || ticketIdInput.trim().length === 0}
              className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? "Checking…" : "Check in ticket"}
            </button>
          </form>

          <p className="text-xs text-muted-foreground">
            Accepts the ticket ID from{" "}
            <span className="font-mono">/tickets/&lt;id&gt;</span>, or the short{" "}
            <span className="font-mono">UPE-XXXXXXXX</span> reference printed beside the QR code. The
            camera is optional: this box is always available, including when a browser blocks camera
            access.
          </p>

          <p className="text-xs text-muted-foreground">
            Scans are checked against <span className="font-medium">{eventTitle}</span> and your own
            organization only. A ticket cannot be checked in twice, and every rejected scan is
            recorded.
          </p>
        </div>
      </section>
    </div>
  );
}