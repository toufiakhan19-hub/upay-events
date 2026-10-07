"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CompassIcon,
  HomeIcon,
  HostIcon,
  ScanIcon,
  SparkleIcon,
  TicketIcon,
  type IconProps,
} from "@/components/ui/icons";

export type NavVariant = "attendee" | "organizer";

type NavItem = {
  href: string;
  label: string;
  icon: (props: IconProps) => React.ReactNode;
  isActive: (pathname: string) => boolean;
};

const ORGANIZER_EVENT_PATH = /^\/organizer\/events\/([^/]+)/;

function itemsFor(variant: NavVariant, pathname: string): NavItem[] {
  if (variant === "attendee") {
    return [
      { href: "/", label: "Home", icon: HomeIcon, isActive: (p) => p === "/" },
      {
        href: "/events",
        label: "Discover",
        icon: CompassIcon,
        isActive: (p) => p.startsWith("/events"),
      },
      {
        href: "/tickets",
        label: "My tickets",
        icon: TicketIcon,
        isActive: (p) => p.startsWith("/tickets"),
      },
      {
        href: "/organizer",
        label: "Organizer",
        icon: SparkleIcon,
        isActive: (p) => p.startsWith("/organizer"),
      },
    ];
  }

  const eventId = ORGANIZER_EVENT_PATH.exec(pathname)?.[1];
  const items: NavItem[] = [
    {
      href: "/organizer",
      label: "Dashboard",
      icon: HostIcon,
      isActive: (p) => p === "/organizer",
    },
  ];

  if (eventId) {
    const base = `/organizer/events/${eventId}`;
    items.push(
      {
        href: base,
        label: "AI forecast",
        icon: SparkleIcon,
        isActive: (p) => p === base,
      },
      {
        href: `${base}/checkin`,
        label: "Check-in",
        icon: ScanIcon,
        isActive: (p) => p.startsWith(`${base}/checkin`),
      },
    );
  }

  items.push({
    href: "/events",
    label: "Attendee site",
    icon: CompassIcon,
    isActive: () => false,
  });

  return items;
}

/** Vertical nav for the desktop sidebar. */
export function SidebarNav({ variant }: { variant: NavVariant }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="mt-10 space-y-2">
      {itemsFor(variant, pathname).map(({ href, label, icon: NavIcon, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition-all ${
              active
                ? "bg-upay-yellow text-upay-navy shadow-active"
                : "text-upay-navy/55 hover:bg-upay-blue-soft hover:text-upay-blue"
            }`}
          >
            <span
              className={`grid size-9 place-items-center rounded-xl ${
                active ? "bg-white/55" : "bg-upay-blue-soft"
              }`}
            >
              <NavIcon className="size-5" />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Fixed bottom tab bar for phones and tablets. */
export function BottomNav({ variant }: { variant: NavVariant }) {
  const pathname = usePathname();
  const items = itemsFor(variant, pathname);

  return (
    <nav
      aria-label="Main navigation"
      className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-white/70 bg-white/85 px-3 pt-2 shadow-nav backdrop-blur-2xl lg:hidden"
    >
      <div
        className="mx-auto grid max-w-2xl"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, label, icon: NavIcon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[0.6875rem] font-semibold transition-colors ${
                active ? "text-upay-blue" : "text-upay-navy/45 hover:text-upay-blue"
              }`}
            >
              <span
                className={`grid size-9 place-items-center rounded-full transition-all ${
                  active ? "bg-upay-yellow shadow-active" : "bg-transparent"
                }`}
              >
                <NavIcon className="size-5" />
              </span>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
