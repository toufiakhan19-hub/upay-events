type PageHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, subtitle, eyebrow, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 lg:mb-8">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[0.6875rem] font-bold tracking-[0.12em] text-upay-blue/70 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-xl font-extrabold tracking-tight text-upay-navy lg:text-2xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-xs font-medium text-upay-navy/50 sm:text-sm">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

/** Small section heading used above card groups. */
export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-extrabold text-upay-navy">{children}</h2>
      {hint ? <p className="mt-0.5 text-[0.6875rem] font-medium text-upay-navy/45">{hint}</p> : null}
    </div>
  );
}
