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
};

export function AiPanel({ title, description, badge, children, emptyMessage }: AiPanelProps) {
  const hasContent = Boolean(children);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-dashed border-border p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground">
          {badge ?? (hasContent ? "Cached forecast" : "Not available yet")}
        </span>
      </header>

      {hasContent ? (
        children
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

/** Bulleted list of model signals, as returned by the AI service. */
export function ReasonList({ reasons }: { reasons: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {reasons.map((reason) => (
        <li key={reason} className="flex gap-2">
          <span aria-hidden className="text-muted-foreground">
            &middot;
          </span>
          <span>{reason}</span>
        </li>
      ))}
    </ul>
  );
}