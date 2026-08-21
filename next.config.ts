import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Match knowledge upload max (10MB) plus multipart overhead.
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
