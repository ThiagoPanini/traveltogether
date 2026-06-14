import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { createApiAccessToken } from "@/lib/identity/api-token";

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
