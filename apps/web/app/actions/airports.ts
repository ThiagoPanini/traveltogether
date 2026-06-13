"use server";

import type { AirportPublic } from "@traveltogether/types";

import { getAuthSession } from "@/auth";
import { searchAirports } from "@/lib/api/airports";

export async function searchAirportsAction(query: string): Promise<AirportPublic[]> {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) return [];
  return searchAirports(session.apiAccessToken, query);
}
