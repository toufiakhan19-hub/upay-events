/**
 * One number in one box. Pure presentation: the value arrives already
 * calculated on the server, so a card never does arithmetic of its own.
 */

type MetricCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Optional quiet variant for values that are expected to be zero. */
  muted?: boolean;
};

export function MetricCard({ label, value, hint, muted = false }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={`text-2xl font-semibold tracking-tight tabular-nums ${
          muted ? "text-muted-foreground" : ""
        }`}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Responsive row of metric cards. */
export function MetricGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}