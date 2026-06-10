import type {
  AddMemberResponse,
  LegPublic,
  MembershipRole,
  MembersListResponse,
  StopPublic,
  TripPublic,
  TripWithMembership,
} from "@traveltogether/types";

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
  data: {
    name: string;
    description: string;
    origin: string;
    airport_code?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  },
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

export async function getTripMembers(
  accessToken: string,
  tripId: string,
): Promise<MembersListResponse | null> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}/trips/${tripId}/members`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  return (await response.json()) as MembersListResponse;
}

export async function addMember(
  accessToken: string,
  tripId: string,
  email: string,
): Promise<AddMemberResponse | null> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}/trips/${tripId}/members`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ email }),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  return (await response.json()) as AddMemberResponse;
}

export async function updateMemberRole(
  accessToken: string,
  tripId: string,
  membershipId: string,
  role: MembershipRole,
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/members/${membershipId}`, {
      method: "PATCH",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ role }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function removeMember(
  accessToken: string,
  tripId: string,
  membershipId: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/members/${membershipId}`, {
      method: "DELETE",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}

export async function getStops(accessToken: string, tripId: string): Promise<StopPublic[]> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/stops`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return [];
    return (await response.json()) as StopPublic[];
  } catch {
    return [];
  }
}

export async function createStop(
  accessToken: string,
  tripId: string,
  data: { city: string; arrival_date?: string | null; departure_date?: string | null },
): Promise<StopPublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/stops`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as StopPublic;
  } catch {
    return null;
  }
}

export async function updateStop(
  accessToken: string,
  tripId: string,
  stopId: string,
  data: Partial<{ city: string; arrival_date: string | null; departure_date: string | null }>,
): Promise<StopPublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/stops/${stopId}`, {
      method: "PATCH",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as StopPublic;
  } catch {
    return null;
  }
}

export async function deleteStop(
  accessToken: string,
  tripId: string,
  stopId: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/stops/${stopId}`, {
      method: "DELETE",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}

export async function reorderStops(
  accessToken: string,
  tripId: string,
  stopIds: string[],
): Promise<StopPublic[]> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/stops`, {
      method: "PATCH",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ stop_ids: stopIds }),
    });
    if (!response.ok) return [];
    return (await response.json()) as StopPublic[];
  } catch {
    return [];
  }
}

export async function getLegs(accessToken: string, tripId: string): Promise<LegPublic[]> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/legs`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return [];
    return (await response.json()) as LegPublic[];
  } catch {
    return [];
  }
}

export async function createLeg(
  accessToken: string,
  tripId: string,
  data: { origin_stop_id?: string | null; destination_stop_id?: string | null },
): Promise<LegPublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/legs`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as LegPublic;
  } catch {
    return null;
  }
}

export async function deleteLeg(
  accessToken: string,
  tripId: string,
  legId: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/legs/${legId}`, {
      method: "DELETE",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}
