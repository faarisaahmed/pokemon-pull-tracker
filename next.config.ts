import type { NextConfig } from "next";

// Next.js reports anonymous usage data to Vercel by default. Off for every
// clone and every deploy, not just whichever machine ran `next telemetry
// disable`.
process.env.NEXT_TELEMETRY_DISABLED = "1";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module; it must not be bundled into the server
  // build or the .node binary goes missing at runtime.
  serverExternalPackages: ["better-sqlite3"],

  // The database is opened by path at request time, so nothing imports it and
  // file tracing would leave it out of a serverless bundle.
  outputFileTracingIncludes: {
    "/**": ["./data/pokemon.db"],
  },
};

export default nextConfig;
