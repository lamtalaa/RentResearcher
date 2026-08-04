import type { NextConfig } from "next";

// STATIC_EXPORT=1 produces a fully static build for GitHub Pages: the API
// route is excluded by the build script and the client scores a prebuilt
// listings snapshot instead (see scripts/build-snapshot.ts).
const isStaticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export" as const,
        basePath,
        images: { unoptimized: true },
      }
    : {}),
  env: {
    NEXT_PUBLIC_DATA_MODE: isStaticExport ? "static" : "live",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
