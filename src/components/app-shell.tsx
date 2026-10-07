import Link from "next/link";

import { switchOrganizerAction } from "@/app/organizer/actions";
import { BottomNav, SidebarNav, type NavVariant } from "@/components/nav-links";
import { buttonClass } from "@/components/ui/button-styles";
import { LogOutIcon } from "@/components/ui/icons";
import { logoutAction } from "@/server/auth/logout-action";
import { getCurrentUser } from "@/server/auth/session";
import { getCurrentOrganizer } from "@/server/organizers/access";

const DISCLAIMERS: Record<NavVariant, string> = {
  attendee:
    "Demo build. upay login and payments are simulated; no real account is created and no money moves.",
  organizer:
    "Demo build. Figures are read from the live database. Organizer access is a demo selector, not authentication. AI forecasts come from a model trained on synthetic data only.",
};

function Logo({ subtitle }: { subtitle: string }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-logo bg-upay-yellow text-xl font-black text-upay-blue shadow-logo">
        U
      </span>
      <span>
        <span className="block text-base font-extrabold tracking-tight text-upay-navy">
          UpayEvents
        </span>
        <span className="block text-[0.625rem] font-bold tracking-[0.12em] text-upay-navy/40 uppercase">
          {subtitle}
        </span>
      </span>
    </Link>
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

/**
 * Who is signed in and how to leave. Server-rendered so neither the session nor
 * the organizer cookie value reaches the client bundle.
 */
async function SessionControls({ variant, compact }: { variant: NavVariant; compact: boolean }) {
  if (variant === "organizer") {
    const organizer = await getCurrentOrganizer();

    if (!organizer) {
      return compact ? null : (
        <p className="px-2 text-xs font-medium text-upay-navy/45">Demo organizer access</p>
      );
    }

    return (
      <div className={compact ? "flex items-center gap-2" : "flex flex-col gap-3 px-2"}>
        {compact ? null : (
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-upay-blue text-xs font-extrabold text-white ring-2 ring-white">
              {initials(organizer.organizationName)}
            </span>
            <span className="min-w-0">
              <span className="block text-[0.625rem] font-bold tracking-wide text-upay-navy/40 uppercase">
                Acting as
              </span>
              <span
                className="block truncate text-sm font-bold text-upay-navy"
                title={organizer.organizationName}
              >
                {organizer.organizationName}
              </span>
            </span>
          </div>
        )}
        <form action={switchOrganizerAction}>
          <button type="submit" className={buttonClass("outline", "sm", compact ? "" : "w-full")}>
            Switch organizer
          </button>
        </form>
      </div>
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link href="/login" className={buttonClass("primary", "sm", compact ? "" : "w-full")}>
        Continue with upay
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 px-2">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full bg-upay-blue text-xs font-extrabold text-white ring-2 ring-white"
        title={user.name}
      >
        {initials(user.name)}
      </span>
      {compact ? null : (
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-upay-navy" title={user.name}>
          {user.name}
        </span>
      )}
      <form action={logoutAction}>
        <button
          type="submit"
          aria-label="Log out"
          title="Log out"
          className="grid size-9 place-items-center rounded-full bg-upay-blue-soft text-upay-blue transition-colors hover:bg-upay-yellow hover:text-upay-navy"
        >
          <LogOutIcon className="size-4" />
        </button>
      </form>
    </div>
  );
}

/**
 * App frame: a sticky sidebar from `lg` up, a compact top bar and a bottom tab
 * bar below it. Both attendee and organizer layouts render through this.
 */
export function AppShell({
  variant,
  children,
}: {
  variant: NavVariant;
  children: React.ReactNode;
}) {
  const subtitle = variant === "organizer" ? "Organizer" : "Event hub";

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-1 lg:border-x lg:border-upay-blue/5 lg:bg-white/25">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-64 -left-24 size-60 rounded-full bg-upay-yellow/20 blur-3xl" />
        <div className="absolute top-[46rem] -right-32 size-72 rounded-full bg-upay-blue/10 blur-3xl" />
      </div>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-upay-blue/7 bg-white/72 px-4 py-7 backdrop-blur-2xl lg:flex xl:px-5">
        <div className="px-2">
          <Logo subtitle={subtitle} />
        </div>

        <SidebarNav variant={variant} />

        <div className="mt-auto flex flex-col gap-5">
          <SessionControls variant={variant} compact={false} />

          <div className="rounded-card bg-upay-blue px-4 py-5 text-white shadow-card">
            <span className="grid size-9 place-items-center rounded-logo bg-upay-yellow text-base font-black text-upay-blue">
              U!
            </span>
            <p className="mt-3 text-sm font-extrabold">Powered by upay</p>
            <p className="mt-1 text-[0.6875rem] leading-relaxed font-medium text-white/65">
              {DISCLAIMERS[variant]}
            </p>
          </div>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/70 bg-white/80 px-5 py-3 backdrop-blur-2xl sm:px-8 lg:hidden">
          <Logo subtitle={subtitle} />
          <SessionControls variant={variant} compact />
        </header>

        <main className="flex flex-1 flex-col px-5 pt-5 pb-8 sm:px-8 sm:pt-7 lg:px-10 lg:pt-8 lg:pb-12 xl:px-12">
          {children}
        </main>

        <p className="px-5 pb-28 text-[0.6875rem] font-medium text-upay-navy/40 sm:px-8 lg:hidden">
          {DISCLAIMERS[variant]}
        </p>
      </div>

      <BottomNav variant={variant} />
    </div>
  );
}
