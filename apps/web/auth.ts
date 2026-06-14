import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { createApiAccessToken } from "@/lib/identity/api-token";

async function verifyOtpWithApi(email: string, code: string): Promise<boolean> {
  const apiUrl = process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/identity/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { valid: boolean };
    return data.valid === true;
  } catch {
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      id: "otp",
      name: "E-mail com código",
      credentials: {
        email: { label: "E-mail", type: "email" },
        code: { label: "Código", type: "text" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const code = typeof credentials?.code === "string" ? credentials.code.trim() : "";
        if (!email || !code) return null;
        const valid = await verifyOtpWithApi(email, code);
        if (!valid) return null;
        return { id: email, email };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user?.email) {
        token.email = user.email;
        token.sub = user.email;

        const displayName = (profile as { name?: string } | undefined)?.name ?? user.name ?? null;
        const avatarUrl =
          (profile as { picture?: string } | undefined)?.picture ?? user.image ?? null;

        token.apiAccessToken = await createApiAccessToken(user.email, {
          displayName: displayName ?? undefined,
          avatarUrl: avatarUrl ?? undefined,
        });
      }
      return token;
    },
    session({ session, token }) {
      session.user = {
        ...session.user,
        email: typeof token.email === "string" ? token.email : session.user?.email,
      };
      session.apiAccessToken =
        typeof token.apiAccessToken === "string" ? token.apiAccessToken : undefined;
      return session;
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
