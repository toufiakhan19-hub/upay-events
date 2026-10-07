import { SparkleIcon } from "@/components/ui/icons";

/**
 * Shell for a panel whose numbers come from the AI service.
 *
 * The dashboard never calls the AI service during a render — it reads cached
 * rows from `event_forecasts` (API_CONTRACT.md §7.1). So the honest state of a
 * panel is one of two things: a persisted forecast, or nothing at all. The
 * second case renders an explicit empty message rather than a zero that would
 * read like a real prediction.
 */

type AiPanelProps = {
  title: string;
  /** One line explaining what this panel will eventually contain. */
  description: string;
  badge?: string;
  /** Real persisted content, or `null` while no record exists. */
  children?: React.ReactNode;
  /** Shown when there is no persisted record. */
  emptyMessage: string;
  className?: string;
};

export function AiPanel({
  title,
  description,
  badge,
  children,
  emptyMessage,
  className = "bg-white",
}: AiPanelProps) {
  const hasContent = Boolean(children);

  return (
    <section className={`flex flex-col gap-4 rounded-card p-5 shadow-card lg:p-6 ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-upay-blue-soft text-upay-blue">
            <SparkleIcon className="size-4" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-extrabold text-upay-navy">{title}</h2>
            <p className="text-[0.6875rem] font-medium text-upay-navy/50">{description}</p>
          </div>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-bold whitespace-nowrap ${
            hasContent ? "bg-upay-yellow text-upay-navy shadow-active" : "bg-upay-blue-soft text-upay-navy/60"
          }`}
        >
          {badge ?? (hasContent ? "Cached forecast" : "Not available yet")}
        </span>
      </header>

      {hasContent ? (
        children
      ) : (
        <p className="rounded-2xl bg-upay-blue-soft/70 p-4 text-sm font-medium text-upay-navy/60">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

/** Model signals as returned by the AI service, styled as factor chips. */
export function ReasonList({ reasons }: { reasons: string[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {reasons.map((reason, index) => (
        <li
          key={reason}
          className="flex items-start gap-2.5 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-upay-navy shadow-chip"
        >
          <span
            aria-hidden
            className={`mt-1.5 size-2 shrink-0 rounded-full ${
              index % 2 === 0 ? "bg-upay-yellow" : "bg-upay-blue"
            }`}
          />
          <span>{reason}</span>
        </li>
      ))}
    </ul>
  );
}
