import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    middlewareClientMaxBodySize: 500 * 1024 * 1024, // 500MB
  },
  async rewrites() {
    return [
      {
        source: '/media-api/:path*',
        destination: `${process.env.MEDIA_API_URL || 'http://localhost:8081/api/v1'}/:path*`,
      },
    ];
  },
  // Add headers to rewrite to include the secret key
  async headers() {
    return [
      {
        source: '/media-api/:path*',
        headers: [
          {
            key: 'X-API-KEY',
            value: process.env.MEDIA_SERVER_API_KEY || '',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
