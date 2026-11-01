import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone",
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "4790",
      },
      {
        protocol: "https",
        hostname: "placehold.net",
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
