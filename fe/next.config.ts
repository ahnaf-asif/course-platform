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
};

export default nextConfig;
