import type { ActivityItemPublic } from "@traveltogether/types";

const apiUrl = () => process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";

export async function getRecentActivity(
  accessToken: string,
  limit = 20,
): Promise<ActivityItemPublic[]> {
  try {
    const response = await fetch(`${apiUrl()}/me/activity?limit=${limit}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return [];
    return (await response.json()) as ActivityItemPublic[];
  } catch {
    return [];
  }
}
