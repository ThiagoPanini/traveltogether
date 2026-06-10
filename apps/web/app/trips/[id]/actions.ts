"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import {
  createStop,
  deleteStop,
  reorderStops,
  updateStop,
  uploadStopCoverImage,
  uploadTripCoverImage,
} from "@/lib/api/trips";

export async function updateTripCoverImageAction(tripId: string, data: FormData) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  await uploadTripCoverImage(session.apiAccessToken, tripId, data);
  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
}

// --- Stops ---

export async function createStopAction(
  tripId: string,
  data: { city: string; arrival_date?: string | null; departure_date?: string | null },
) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return createStop(session.apiAccessToken, tripId, data);
}

export async function deleteStopAction(tripId: string, stopId: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return deleteStop(session.apiAccessToken, tripId, stopId);
}

export async function updateStopAction(
  tripId: string,
  stopId: string,
  data: Partial<{ city: string; arrival_date: string | null; departure_date: string | null }>,
) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return updateStop(session.apiAccessToken, tripId, stopId, data);
}

export async function updateStopCoverImageAction(tripId: string, stopId: string, data: FormData) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  const result = await uploadStopCoverImage(session.apiAccessToken, tripId, stopId, data);
  revalidatePath(`/trips/${tripId}`);
  return result;
}

export async function reorderStopsAction(tripId: string, stopIds: string[]) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return reorderStops(session.apiAccessToken, tripId, stopIds);
}
