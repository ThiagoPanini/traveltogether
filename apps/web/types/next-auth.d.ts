import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    apiAccessToken?: string;
    user?: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    apiAccessToken?: string;
  }
}
