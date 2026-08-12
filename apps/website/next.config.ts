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
  async redirects() {
    return [
      // Old huntly.app path - matches our consolidated /account-delete page.
      {
        source: "/delete-account",
        destination: "/account-delete",
        permanent: true,
      },
    ];
  },
};

export default withPayload(nextConfig);

