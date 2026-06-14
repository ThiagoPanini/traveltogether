import type { PlacePublic } from "@traveltogether/types";

const apiUrl = () => process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";

export async function searchPlaces(
  accessToken: string | undefined,
  query: string,
  limit = 8,
): Promise<PlacePublic[]> {
  if (!accessToken || !query.trim()) return [];

  try {
    const url = `${apiUrl()}/places/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`;
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return [];
    return (await response.json()) as PlacePublic[];
  } catch {
    return [];
  }
}
