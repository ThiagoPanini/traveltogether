import type {
  FareQuoteCreate,
  FareQuotePublic,
  FareQuoteUpdate,
  UpvoteResponse,
} from "@traveltogether/types";

const apiUrl = () => process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}

export async function getFares(accessToken: string, legId: string): Promise<FareQuotePublic[]> {
  try {
    const response = await fetch(`${apiUrl()}/legs/${legId}/fares`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return [];
    return (await response.json()) as FareQuotePublic[];
  } catch {
    return [];
  }
}

export async function createFare(
  accessToken: string,
  legId: string,
  data: FareQuoteCreate,
): Promise<FareQuotePublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/legs/${legId}/fares`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as FareQuotePublic;
  } catch {
    return null;
  }
}

export async function updateFare(
  accessToken: string,
  legId: string,
  fareId: string,
  data: FareQuoteUpdate,
): Promise<FareQuotePublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/legs/${legId}/fares/${fareId}`, {
      method: "PATCH",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as FareQuotePublic;
  } catch {
    return null;
  }
}

export async function deleteFare(
  accessToken: string,
  legId: string,
  fareId: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl()}/legs/${legId}/fares/${fareId}`, {
      method: "DELETE",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}

export async function getUpvote(
  accessToken: string,
  fareId: string,
): Promise<UpvoteResponse | null> {
  try {
    const response = await fetch(`${apiUrl()}/fares/${fareId}/upvote`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return null;
    return (await response.json()) as UpvoteResponse;
  } catch {
    return null;
  }
}

export async function toggleUpvote(
  accessToken: string,
  fareId: string,
): Promise<UpvoteResponse | null> {
  try {
    const response = await fetch(`${apiUrl()}/fares/${fareId}/upvote`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return null;
    return (await response.json()) as UpvoteResponse;
  } catch {
    return null;
  }
}

export async function chooseFare(
  accessToken: string,
  legId: string,
  fareId: string,
): Promise<FareQuotePublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/legs/${legId}/fares/${fareId}/choose`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return null;
    return (await response.json()) as FareQuotePublic;
  } catch {
    return null;
  }
}
