import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { isGoogleEnabled, verifyGoogle } from "@/lib/auth/google";
import { verifyOtp } from "@/lib/auth/otp";

/**
 * Cabeamento do Auth.js v5 (ADR-0004): o web é cliente OAuth + BFF; a API é a
 * autoridade de identidade. O provedor `otp` (Credentials) entrega e-mail+código à
 * API interna via `verifyOtp`. O Google faz a dança OAuth aqui e o `id_token` é
 * trocado por uma sessão na API (`verifyGoogle`) no callback `signIn`. Em ambos os
 * casos o token opaco que a API cunha viaja no JWT (cookie httpOnly) e é repassado
 * como `Bearer` pelo BFF — nunca chega ao browser. Sem `GOOGLE_CLIENT_ID`/`SECRET`,
 * o provider nem é cabeado (botão "indisponível"); a tela não quebra.
 */

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    needsOnboarding?: boolean;
  }
  interface User {
    accessToken?: string;
    needsOnboarding?: boolean;
  }
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    id: "otp",
    name: "Código de embarque",
    credentials: { email: {}, code: {} },
    authorize: async (credentials) => {
      const email = typeof credentials?.email === "string" ? credentials.email : "";
      const code = typeof credentials?.code === "string" ? credentials.code : "";
      if (!email || !code) {
        return null;
      }
      const user = await verifyOtp(email, code);
      if (!user) {
        return null;
      }
      return {
        id: user.id,
        email: user.email,
        accessToken: user.accessToken,
        needsOnboarding: user.needsOnboarding,
      };
    },
  }),
];

if (isGoogleEnabled()) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    // Google: troca o `id_token` por uma sessão da API e carimba o resultado no
    // `user` (que flui para o `jwt`). Prova recusada nega o sign-in (sem sessão).
    signIn: async ({ account, user }) => {
      if (account?.provider !== "google") {
        return true;
      }
      const idToken = typeof account.id_token === "string" ? account.id_token : "";
      const verified = idToken ? await verifyGoogle(idToken) : null;
      if (!verified) {
        return false;
      }
      user.accessToken = verified.accessToken;
      user.needsOnboarding = verified.needsOnboarding;
      return true;
    },
    jwt: ({ token, user }) => {
      if (user) {
        token.accessToken = user.accessToken;
        token.needsOnboarding = user.needsOnboarding;
      }
      return token;
    },
    session: ({ session, token }) => {
      // O JWT do Auth.js tem index signature (valores `unknown`); estreita na leitura.
      session.accessToken = token.accessToken as string | undefined;
      session.needsOnboarding = token.needsOnboarding as boolean | undefined;
      return session;
    },
  },
});
