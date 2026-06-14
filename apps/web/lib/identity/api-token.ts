import { SignJWT } from "jose";

interface ApiAccessTokenOptions {
  secret?: string;
  expSeconds?: number;
  displayName?: string | null;
  avatarUrl?: string | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createApiAccessToken(
  email: string,
  options: ApiAccessTokenOptions = {},
): Promise<string> {
  const secret = options.secret ?? process.env.AUTH_SECRET ?? "";
  const normalizedEmail = normalizeEmail(email);
  const now = Math.floor(Date.now() / 1000);

  const payload: Record<string, unknown> = { email: normalizedEmail };
  if (options.displayName != null) payload.display_name = options.displayName;
  if (options.avatarUrl != null) payload.avatar_url = options.avatarUrl;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(normalizedEmail)
    .setIssuedAt(now)
    .setExpirationTime(now + (options.expSeconds ?? 60 * 60 * 24 * 30))
    .sign(new TextEncoder().encode(secret));
}
