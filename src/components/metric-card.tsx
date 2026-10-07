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
  /** Colour of the dot above the value. */
  tone?: "yellow" | "blue";
};

export function MetricCard({ label, value, hint, muted = false, tone = "yellow" }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-card bg-white p-4 shadow-card lg:p-5">
      <span
        aria-hidden
        className={`mb-1.5 block size-2 rounded-full ring-4 ${
          tone === "yellow" ? "bg-upay-yellow ring-upay-yellow-soft" : "bg-upay-blue ring-upay-blue-soft"
        }`}
      />
      <p className="text-[0.6875rem] font-semibold tracking-wide text-upay-navy/45 uppercase">
        {label}
      </p>
      <p
        className={`text-2xl font-extrabold tracking-tight tabular-nums ${
          muted ? "text-upay-navy/35" : "text-upay-navy"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="text-[0.6875rem] font-medium text-upay-navy/45">{hint}</p> : null}
    </div>
  );
}

/** Responsive row of metric cards. */
export function MetricGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">{children}</div>;
}
