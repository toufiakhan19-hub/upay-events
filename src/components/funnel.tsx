import { formatCount, formatPercent } from "@/lib/format";

/**
 * Registration → attendance funnel.
 *
 * Every stage is a real count taken from the database; the bars only scale those
 * counts against the first stage. No stage is estimated or interpolated, and an
 * event with no registrations renders the empty state instead of empty bars.
 */

/** Yellow at the top of the funnel fading to upay blue at the bottom. */
const STAGE_COLORS = ["#ffd200", "#c9b13a", "#6a88cc", "#0033a0"];

export type FunnelStage = {
  label: string;
  count: number;
};

export function RegistrationFunnel({ stages }: { stages: FunnelStage[] }) {
  const firstStageCount = stages[0]?.count ?? 0;

  if (firstStageCount === 0) {
    return (
      <p className="rounded-2xl bg-upay-blue-soft/70 p-4 text-sm font-medium text-upay-navy/60">
        No registrations yet, so there is no funnel to draw. Attendee registrations appear here the
        moment somebody signs up and pays.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {stages.map((stage, index) => {
        const shareOfRegistrations = stage.count / firstStageCount;
        const previousCount = index === 0 ? null : stages[index - 1].count;
        const stepRate = previousCount === null || previousCount === 0 ? null : stage.count / previousCount;

        return (
          <li key={stage.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-bold text-upay-navy">{stage.label}</span>
              <span className="font-extrabold text-upay-navy tabular-nums">
                {formatCount(stage.count)}
                {stepRate === null ? (
                  <span className="ml-1 text-xs font-medium text-upay-navy/45">
                    ({formatPercent(shareOfRegistrations, 0)} of registrations)
                  </span>
                ) : (
                  <span className="ml-1 text-xs font-medium text-upay-navy/45">
                    ({formatPercent(stepRate, 0)} of previous step)
                  </span>
                )}
              </span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-upay-blue/8">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(1, Math.min(100, shareOfRegistrations * 100))}%`,
                  background: STAGE_COLORS[index % STAGE_COLORS.length],
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}