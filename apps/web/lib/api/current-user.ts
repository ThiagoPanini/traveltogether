import type { UserPublic, UserUpdate } from "@traveltogether/types";

export type CurrentUser = UserPublic;

const apiUrl = () => process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";

export async function getCurrentUser(accessToken: string | undefined): Promise<CurrentUser | null> {
  if (!accessToken) return null;

  let response: Response;
  try {
    response = await fetch(`${apiUrl()}/identity/me`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;
  return (await response.json()) as CurrentUser;
}

export async function updateProfile(
  accessToken: string | undefined,
  patch: UserUpdate,
): Promise<CurrentUser | null> {
  if (!accessToken) return null;

  let response: Response;
  try {
    response = await fetch(`${apiUrl()}/identity/me`, {
      method: "PATCH",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;
  return (await response.json()) as CurrentUser;
}
