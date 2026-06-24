import NextAuth from "next-auth";

/**
 * Cabeamento do Auth.js v5 (ADR-0004): o web é cliente OAuth + BFF; a API é a
 * autoridade de identidade. Aqui só o esqueleto — estratégia de sessão `jwt`,
 * `AUTH_SECRET` lido do ambiente, `trustHost` para rodar atrás do proxy do
 * Coolify. Os provedores funcionais (OTP, Google) chegam nas fatias #190/#191.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [],
  session: { strategy: "jwt" },
  trustHost: true,
});
