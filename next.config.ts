import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone",
  images: {
    // Both settings below exist only for PLACEHOLDER_IMAGE (src/static/images.ts) and
    // should be removed with it. `dangerouslyAllowSVG` earns its name: next/image will
    // serve SVG from the allowed hosts, and an SVG can carry <script>. The CSP beside
    // it is what makes that safe — it forbids scripts and sandboxes the document, so
    // do not drop one without the other.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.net",
      },
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
