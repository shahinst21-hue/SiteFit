import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  outputFileTracingIncludes: { '/reports/*/pdf': ['./public/fonts/DejaVuSans.ttf'], '/purchase/confirmation': ['./public/fonts/DejaVuSans.ttf'] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
      ...["/snapshots/:path*","/purchase/:path*","/reports/:path*","/account/:path*","/internal/:path*","/auth/:path*","/dev/:path*","/login"].map(source=>({ source, headers: [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ] })),
    ];
  },
};

export default nextConfig;
