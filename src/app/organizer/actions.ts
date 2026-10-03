"use server";

import { redirect } from "next/navigation";

import { grantOrganizerAccess, revokeOrganizerAccess } from "@/server/organizers/access";

/**
 * Demo organizer access actions.
 *
 * `selectOrganizerAction` takes an organizer id from a hidden form field, which
 * means the browser chooses the value — so the id is only ever a *reference*.
 * It is resolved against `organizers` on the server before any cookie is
 * written, and the dashboard queries re-scope every read by the resulting
 * organizer id.
 */

export async function selectOrganizerAction(formData: FormData): Promise<void> {
  const organizerId = formData.get("organizerId");

  const organizer =
    typeof organizerId === "string" ? await grantOrganizerAccess(organizerId) : null;

  // An unknown id simply lands back on the picker instead of erroring, which is
  // what happens if the page was open while the database was reseeded.
  redirect(organizer ? "/organizer" : "/organizer?access=unknown");
}

export async function switchOrganizerAction(): Promise<void> {
  await revokeOrganizerAccess();
  redirect("/organizer");
}