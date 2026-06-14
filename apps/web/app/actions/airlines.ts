"use server";

import type { AirlinePublic } from "@traveltogether/types";

import { getAuthSession } from "@/auth";
import { searchAirlines } from "@/lib/api/airlines";

export async function searchAirlinesAction(query: string): Promise<AirlinePublic[]> {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) return [];
  return searchAirlines(session.apiAccessToken, query);
}
