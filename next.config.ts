import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: process.env.NODE_ENV === 'production' ? '/deepresearch' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/deepresearch' : '',
  // trailingSlash caused 308 redirects for API routes; disabling to ensure /api paths resolve correctly
  trailingSlash: false,
  /* config options here */
};

export default nextConfig;
