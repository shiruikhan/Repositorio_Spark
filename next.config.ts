import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Exclui assets estáticos imutáveis do Next.js — eles têm hash no nome e podem ser cacheados
        source: "/((?!_next/static|_next/image|favicon).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
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

export default withSentryConfig(nextConfig, {
  // Silencia logs do Sentry durante o build
  silent: true,
  // Desativa telemetria do Sentry CLI
  telemetry: false,
  // Não faz upload de source maps (sem Sentry org/project configurado)
  sourcemaps: { disable: true },
});
