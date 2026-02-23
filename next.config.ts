import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverExternalPackages: ["@prisma/client", "pg"],
  },
};

export default nextConfig;
