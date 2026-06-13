"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { createStop, deleteStop, reorderStops, updateStop, updateTrip } from "@/lib/api/trips";

// --- Trip ---

export async function updateTripAction(
  tripId: string,
  data: Partial<{
    name: string;
    description: string;
    origin: string;
    airport_code: string | null;
    latitude: number | null;
    longitude: number | null;
    start_date: string | null;
    end_date: string | null;
  }>,
) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  const updated = await updateTrip(session.apiAccessToken, tripId, data);
  if (updated) {
    revalidatePath("/trips");
    revalidatePath(`/trips/${tripId}`);
  }
  return updated;
}

// --- Stops ---

export async function createStopAction(
  tripId: string,
  data: {
    city: string;
    airport_code?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    arrival_date?: string | null;
    departure_date?: string | null;
  },
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
  data: Partial<{
    city: string;
    airport_code: string | null;
    latitude: number | null;
    longitude: number | null;
    arrival_date: string | null;
    departure_date: string | null;
  }>,
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
