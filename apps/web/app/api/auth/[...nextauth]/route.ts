import { handlers } from "@/auth";

// Endpoint público do Auth.js (callbacks OAuth, etc.). É o único host público
// do sistema; a API é interna (ADR-0011).
export const { GET, POST } = handlers;
