import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    webpackBuildWorker: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.4-paws.org',
        port: '',
        pathname: '/**', 
      },
    ],
  },
};

export default nextConfig;