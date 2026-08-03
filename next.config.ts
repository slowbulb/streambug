import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Raised for the local-disk upload fallback (no Blob storage
      // configured), where audio files pass through the Server Action body.
      // When BLOB_READ_WRITE_TOKEN is set, uploads instead go straight from
      // the browser to Blob storage and this limit doesn't apply to them.
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
