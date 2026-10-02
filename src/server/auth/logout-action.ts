"use server";

import { redirect } from "next/navigation";

import { deleteSession } from "./session";

/**
 * Logout. Destroys the session row and clears the cookie, then returns the
 * attendee to the landing page. Wired to a plain `<form>` in the header, so no
 * client-side session state has to be kept in sync.
 */
export async function logoutAction(): Promise<void> {
  await deleteSession();

  redirect("/");
}