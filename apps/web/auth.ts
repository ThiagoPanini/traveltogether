import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { authorizeEmailForAccess } from "@/lib/identity/access-gate";
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
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "E-mail", type: "email" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        return authorizeEmailForAccess(email);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
        token.sub = user.email;
        token.apiAccessToken = await createApiAccessToken(user.email);
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
