import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.huntly.app",
      },
      {
        protocol: "https",
        hostname: "media.huntly.world",
      },
    ],
  },
};

export default withPayload(nextConfig);

