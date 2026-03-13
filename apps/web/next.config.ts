import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@docuroute/core", "@docuroute/db", "@docuroute/types", "@docuroute/emails"],
};

export default nextConfig;
