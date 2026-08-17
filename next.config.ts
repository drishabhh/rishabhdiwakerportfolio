import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "vumbnail.com",
      },
      {
        protocol: "https",
        hostname: "i.vimeocdn.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/admin/highlight-blob",
        destination: "https://vercel.com/api/blob",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://vumbnail.com https://i.vimeocdn.com https://*.public.blob.vercel-storage.com https://*.private.blob.vercel-storage.com; font-src 'self' data:; media-src 'self' blob: https://*.public.blob.vercel-storage.com https://*.private.blob.vercel-storage.com; connect-src 'self' https://vercel.com https://*.vercel.com https://blob.vercel-storage.com https://*.blob.vercel-storage.com https://*.public.blob.vercel-storage.com https://*.private.blob.vercel-storage.com; frame-src 'self' https://www.youtube.com https://player.vimeo.com; frame-ancestors 'self';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
