export interface CurrentUser {
  id: string;
  email: string;
}

export async function getCurrentUser(accessToken: string | undefined): Promise<CurrentUser | null> {
  if (!accessToken) return null;

  const apiUrl = process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/identity/me`, {
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
