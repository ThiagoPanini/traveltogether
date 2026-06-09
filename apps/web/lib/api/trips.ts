import type { TripPublic, TripWithMembership } from "@traveltogether/types";

const apiUrl = () => process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}

export async function getTrips(accessToken: string): Promise<TripWithMembership[]> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}/trips`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
  } catch {
    return [];
  }
  if (!response.ok) return [];
  return (await response.json()) as TripWithMembership[];
}

export async function getTrip(
  accessToken: string,
  tripId: string,
): Promise<TripWithMembership | null> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}/trips/${tripId}`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  return (await response.json()) as TripWithMembership;
}

export async function createTrip(
  accessToken: string,
  data: { name: string; description: string; origin: string },
): Promise<TripWithMembership | null> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}/trips`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  return (await response.json()) as TripWithMembership;
}

export async function updateTrip(
  accessToken: string,
  tripId: string,
  data: Partial<{ name: string; description: string; origin: string }>,
): Promise<TripPublic | null> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}/trips/${tripId}`, {
      method: "PATCH",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  return (await response.json()) as TripPublic;
}
