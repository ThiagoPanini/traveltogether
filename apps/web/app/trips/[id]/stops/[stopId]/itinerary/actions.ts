"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import {
  createItineraryItem,
  deleteItineraryItem,
  reorderItineraryItems,
  updateItineraryItem,
} from "@/lib/api/trips";

export async function createItineraryItemAction(
  tripId: string,
  stopId: string,
  data: { title: string; notes?: string; link?: string; day?: string | null; time?: string | null },
) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return createItineraryItem(session.apiAccessToken, tripId, stopId, data);
}

export async function updateItineraryItemAction(
  tripId: string,
  stopId: string,
  itemId: string,
  data: {
    title?: string | null;
    notes?: string | null;
    link?: string | null;
    day?: string | null;
    time?: string | null;
  },
) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return updateItineraryItem(session.apiAccessToken, tripId, stopId, itemId, data);
}

export async function deleteItineraryItemAction(tripId: string, stopId: string, itemId: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return deleteItineraryItem(session.apiAccessToken, tripId, stopId, itemId);
}

export async function reorderItineraryItemsAction(
  tripId: string,
  stopId: string,
  itemIds: string[],
) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  const result = await reorderItineraryItems(session.apiAccessToken, tripId, stopId, itemIds);
  revalidatePath(`/trips/${tripId}/stops/${stopId}/itinerary`);
  return result;
}
