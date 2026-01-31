import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
      },
      {
        protocol: "https",
        hostname: "lindwayhome.com",
      },
      {
        protocol: "https",
        hostname: "www.lindwayhome.com",
      },
    ],
  },
};

export default nextConfig;
