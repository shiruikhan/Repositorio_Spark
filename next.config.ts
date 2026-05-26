import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Força no-store em todas as rotas dinâmicas para evitar
      // cache stale na Hostinger (e qualquer CDN intermediária)
      {
        // Exclui assets estáticos imutáveis do Next.js — eles têm hash no nome e podem ser cacheados
        source: "/((?!_next/static|_next/image|favicon).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Surrogate-Control", value: "no-store" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "obbymrwivuhjopwnmoxx.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
