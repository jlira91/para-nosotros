import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // pdfjs-dist optionally imports canvas (for Node.js); ignore it in the browser bundle
    config.resolve.alias.canvas = false
    return config
  },
};

export default nextConfig;
