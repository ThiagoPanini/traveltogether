export interface AuthorizedUser {
  id: string;
  email: string;
}

type AuthEnv = Record<string, string | undefined>;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((email) => normalizeEmail(email))
      .filter(Boolean),
  );
}

export function authorizeEmailForAccess(
  email: string,
  env: AuthEnv = process.env,
): AuthorizedUser | null {
  const normalizedEmail = normalizeEmail(email);
  if (!parseAllowlist(env.AUTH_ALLOWLIST).has(normalizedEmail)) return null;
  return { id: normalizedEmail, email: normalizedEmail };
}
