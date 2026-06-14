"use server";

import type { PlacePublic } from "@traveltogether/types";

import { getAuthSession } from "@/auth";
import { searchPlaces } from "@/lib/api/places";

export async function searchPlacesAction(query: string): Promise<PlacePublic[]> {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) return [];
  return searchPlaces(session.apiAccessToken, query);
}
