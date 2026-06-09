import { SignJWT } from "jose";

interface ApiAccessTokenOptions {
  secret?: string;
  expSeconds?: number;
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

  return new SignJWT({ email: normalizedEmail })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(normalizedEmail)
    .setIssuedAt(now)
    .setExpirationTime(now + (options.expSeconds ?? 60 * 60 * 24 * 30))
    .sign(new TextEncoder().encode(secret));
}
