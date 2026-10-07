import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { ShieldIcon } from "@/components/ui/icons";
import { safeInternalPath } from "@/lib/redirect";
import { getCurrentUser } from "@/server/auth/session";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Continue with upay",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/events");
  }

  const params = await searchParams;
  const requestedNext = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-4 lg:py-10">
      <Card className="event-card overflow-hidden">
        <div className="hero-banner relative px-6 pt-6 pb-10 text-white">
          <div className="pointer-events-none absolute -top-8 -right-8 size-32 rounded-full border-[2rem] border-white/10" />
          <span className="grid size-12 place-items-center rounded-logo bg-upay-yellow text-2xl font-black text-upay-blue shadow-logo ring-4 ring-white/30">
            U
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Continue with upay</h1>
          <p className="mt-1.5 text-sm font-medium text-white/80">
            Sign in to browse student events on UpayEvents.
          </p>
          <div className="hero-wave absolute inset-x-0 bottom-0 h-8" />
        </div>

        <div className="flex flex-col gap-5 p-6">
          <p className="flex gap-2.5 rounded-2xl bg-upay-blue-soft p-3 text-xs font-medium text-upay-navy/70">
            <ShieldIcon className="size-4 shrink-0 text-upay-blue" />
            No password. This demo identifies you by name and phone number, the same fields a real
            upay account would confirm.
          </p>

          <LoginForm next={safeInternalPath(requestedNext)} />
        </div>
      </Card>

      <p className="text-center text-xs font-medium text-upay-navy/50">
        Signing in with a number you used before returns you to the same account.{" "}
        <Link href="/events" className="font-bold text-upay-blue hover:underline">
          Browse events
        </Link>
      </p>
    </div>
  );
}
