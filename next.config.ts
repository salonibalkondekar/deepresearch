import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: process.env.NODE_ENV === 'production' ? '/deepresearch' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/deepresearch' : '',
  trailingSlash: true,
  /* config options here */
};

export default nextConfig;
