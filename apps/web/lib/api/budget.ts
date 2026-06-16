import type {
  BudgetSummary,
  ExtraCreate,
  ExtraPublic,
  ExtraUpdate,
  LodgingCreate,
  LodgingPublic,
  LodgingUpdate,
} from "@traveltogether/types";

const apiUrl = () => process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}

export async function getBudget(
  accessToken: string,
  tripId: string,
): Promise<BudgetSummary | null> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/budget`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return null;
    return (await response.json()) as BudgetSummary;
  } catch {
    return null;
  }
}

export async function getLodgings(accessToken: string, tripId: string): Promise<LodgingPublic[]> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/lodgings`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return [];
    return (await response.json()) as LodgingPublic[];
  } catch {
    return [];
  }
}

export async function createLodging(
  accessToken: string,
  tripId: string,
  data: LodgingCreate,
): Promise<LodgingPublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/lodgings`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as LodgingPublic;
  } catch {
    return null;
  }
}

export async function updateLodging(
  accessToken: string,
  tripId: string,
  lodgingId: string,
  data: LodgingUpdate,
): Promise<LodgingPublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/lodgings/${lodgingId}`, {
      method: "PATCH",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as LodgingPublic;
  } catch {
    return null;
  }
}

export async function deleteLodging(
  accessToken: string,
  tripId: string,
  lodgingId: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/lodgings/${lodgingId}`, {
      method: "DELETE",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}

export async function getExtras(accessToken: string, tripId: string): Promise<ExtraPublic[]> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/extras`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return [];
    return (await response.json()) as ExtraPublic[];
  } catch {
    return [];
  }
}

export async function createExtra(
  accessToken: string,
  tripId: string,
  data: ExtraCreate,
): Promise<ExtraPublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/extras`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as ExtraPublic;
  } catch {
    return null;
  }
}

export async function updateExtra(
  accessToken: string,
  tripId: string,
  extraId: string,
  data: ExtraUpdate,
): Promise<ExtraPublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/extras/${extraId}`, {
      method: "PATCH",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as ExtraPublic;
  } catch {
    return null;
  }
}

export async function deleteExtra(
  accessToken: string,
  tripId: string,
  extraId: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/extras/${extraId}`, {
      method: "DELETE",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}
