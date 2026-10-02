import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

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
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 py-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Continue with upay</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to browse student events on UpayEvents. No password — this demo identifies you by
          name and phone number, the same fields a real upay account would confirm.
        </p>
      </header>

      <LoginForm next={safeInternalPath(requestedNext)} />

      <p className="text-xs text-muted-foreground">
        Signing in with a number you used before returns you to the same account.{" "}
        <Link href="/events" className="underline">
          Browse events
        </Link>
      </p>
    </div>
  );
}