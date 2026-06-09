export type HealthLevel = "ok" | "error";

export interface ApiHealth {
  status: HealthLevel;
  db: HealthLevel;
}

const FALLBACK: ApiHealth = { status: "error", db: "error" };

export async function getApiHealth(): Promise<ApiHealth> {
  const apiUrl = process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/health`, { cache: "no-store" });
    if (!res.ok) return FALLBACK;
    return (await res.json()) as ApiHealth;
  } catch {
    return FALLBACK;
  }
}
