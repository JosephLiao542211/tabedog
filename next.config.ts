import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cheerio pulls in undici/parse5; keep it out of the server bundle and load it from node_modules
  serverExternalPackages: ["cheerio"],
  images: {
    // blog covers and avatars uploaded through /admin live in the Supabase `blog` bucket
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL ? [new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/**`)] : [],
  },
};

export default nextConfig;
