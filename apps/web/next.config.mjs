import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Em monorepo, ancora o tracing na raiz para o standalone montar apps/web/server.js.
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
};

export default nextConfig;
