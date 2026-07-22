import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // pdfjs-dist imports canvas for Node.js; ignore it in the browser bundle
      canvas: { browser: false },
    },
  },
};

export default nextConfig;
