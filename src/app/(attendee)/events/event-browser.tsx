"use client";

import { useMemo, useState } from "react";

import { EventCard } from "@/components/event-card";
import { Card } from "@/components/ui/card";
import { SearchIcon } from "@/components/ui/icons";
import type { EventCategory } from "@/db/enums";
import { categoryLabel } from "@/lib/format";
import type { EventListItem } from "@/server/events/queries";

/**
 * Search box and category chips over the already-loaded published events.
 * Filtering is local: the list is small and fully rendered on the server first.
 */
export function EventBrowser({ events }: { events: EventListItem[] }) {
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const [search, setSearch] = useState("");

  const categories = useMemo(
    () => Array.from(new Set(events.map((event) => event.category))),
    [events],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesCategory = category === "all" || event.category === category;
      const matchesSearch =
        !query ||
        `${event.title} ${event.venue} ${event.organizerName} ${categoryLabel(event.category)}`
          .toLowerCase()
          .includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [events, category, search]);

  const chips: { value: EventCategory | "all"; label: string }[] = [
    { value: "all", label: "All" },
    ...categories.map((value) => ({ value, label: categoryLabel(value) })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex h-11 w-full items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 text-upay-navy/40 shadow-chip backdrop-blur-xl lg:max-w-md">
          <SearchIcon className="size-4 shrink-0" />
          <input
            aria-label="Search events"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-upay-navy outline-none placeholder:text-upay-navy/35"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, venue or organizer"
            type="search"
            value={search}
          />
        </label>

        <div className="scrollbar-none -mx-5 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0">
          <div className="flex w-max gap-2 lg:w-auto lg:flex-wrap lg:justify-end">
            {chips.map((chip) => {
              const active = chip.value === category;
              return (
                <button
                  key={chip.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(chip.value)}
                  className={`h-9 rounded-full border px-4 text-xs font-bold whitespace-nowrap shadow-chip transition-all ${
                    active
                      ? "border-upay-yellow bg-upay-yellow text-upay-navy"
                      : "border-upay-navy/10 bg-white/85 text-upay-navy/60 hover:border-upay-blue/30"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs font-medium text-upay-navy/50" aria-live="polite">
        Showing {visible.length} of {events.length} {events.length === 1 ? "event" : "events"}
      </p>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        {visible.length === 0 ? (
          <Card className="p-8 text-center md:col-span-2 xl:col-span-3">
            <SearchIcon className="mx-auto mb-3 size-6 text-upay-blue/40" />
            <p className="font-bold text-upay-navy">No events found</p>
            <p className="mt-1 text-sm text-upay-navy/50">Try another search or category.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
