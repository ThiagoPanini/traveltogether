import type { AirlinePublic } from "@traveltogether/types";

const apiUrl = () => process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";

export async function searchAirlines(
  accessToken: string | undefined,
  query: string,
  limit = 8,
): Promise<AirlinePublic[]> {
  if (!accessToken || !query.trim()) return [];

  try {
    const url = `${apiUrl()}/airlines/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`;
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return [];
    return (await response.json()) as AirlinePublic[];
  } catch {
    return [];
  }
}
