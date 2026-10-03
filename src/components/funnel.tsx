import { formatCount, formatPercent } from "@/lib/format";

/**
 * Registration → attendance funnel.
 *
 * Every stage is a real count taken from the database; the bars only scale those
 * counts against the first stage. No stage is estimated or interpolated, and an
 * event with no registrations renders the empty state instead of empty bars.
 */

export type FunnelStage = {
  label: string;
  count: number;
};

export function RegistrationFunnel({ stages }: { stages: FunnelStage[] }) {
  const firstStageCount = stages[0]?.count ?? 0;

  if (firstStageCount === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        No registrations yet, so there is no funnel to draw. Attendee registrations appear here the
        moment somebody signs up and pays.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {stages.map((stage, index) => {
        const shareOfRegistrations = stage.count / firstStageCount;
        const previousCount = index === 0 ? null : stages[index - 1].count;
        const stepRate = previousCount === null || previousCount === 0 ? null : stage.count / previousCount;

        return (
          <li key={stage.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{stage.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatCount(stage.count)}
                {stepRate === null ? (
                  <span className="ml-1 text-xs">({formatPercent(shareOfRegistrations, 0)} of registrations)</span>
                ) : (
                  <span className="ml-1 text-xs">({formatPercent(stepRate, 0)} of previous step)</span>
                )}
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.max(1, Math.min(100, shareOfRegistrations * 100))}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}