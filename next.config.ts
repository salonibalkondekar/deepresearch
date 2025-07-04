import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/deepresearch',
  assetPrefix: '/deepresearch',
  trailingSlash: true,
  /* config options here */
};

export default nextConfig;
