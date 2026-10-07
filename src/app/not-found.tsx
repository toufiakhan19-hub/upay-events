import Link from "next/link";

import { buttonClass } from "@/components/ui/button-styles";
import { Card } from "@/components/ui/card";
import { CompassIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24">
      <Card className="event-card flex flex-col items-start gap-4 p-7">
        <span className="grid size-11 place-items-center rounded-full bg-upay-yellow-soft text-upay-blue">
          <CompassIcon className="size-5" />
        </span>
        <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-upay-blue/70 uppercase">404</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-upay-navy">
          We could not find that event
        </h1>
        <p className="text-sm text-upay-navy/55">
          The link may be wrong, or the event may no longer be published.
        </p>
        <Link href="/events" className={buttonClass("primary")}>
          Browse events
        </Link>
      </Card>
    </main>
  );
}
