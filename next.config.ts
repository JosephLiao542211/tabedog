import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cheerio pulls in undici/parse5; keep it out of the server bundle and load it from node_modules
  serverExternalPackages: ["cheerio"],
};

export default nextConfig;
