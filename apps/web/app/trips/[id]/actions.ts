"use server";

import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { createStop, deleteStop, reorderStops, updateStop } from "@/lib/api/trips";

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

export async function reorderStopsAction(tripId: string, stopIds: string[]) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return reorderStops(session.apiAccessToken, tripId, stopIds);
}
