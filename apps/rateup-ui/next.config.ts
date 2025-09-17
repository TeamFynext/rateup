import type { NextConfig } from "next";

import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = bundleAnalyzer({
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // typedRoutes: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "djd7kjh9uwow0.cloudfront.net",
        port: "",
      },
      {
        protocol: "https",
        hostname: "blog.rateup.app",
      },
    ],
  },
  htmlLimitedBots: /.*/,
  compiler:
    process.env.NODE_ENV === "production"
      ? {
          removeConsole: true,
        }
      : {},
  turbopack: { resolveAlias: { html2canvas: "html2canvas-pro" } },
  experimental: {
    // optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
    // reactCompiler: true,
  },
  webpack: (config) => {
    config.resolve.alias["html2canvas"] = "html2canvas-pro";
    config.resolve.conditionNames = ["require", "..."];
    return config;
  },
  // transpilePackages: ["@mui/x-data-grid"],
  async redirects() {
    return [
      {
        source: "/shipping-and-delivery",
        destination: "/terms-of-service#shipping-and-delivery",
        permanent: false,
      },
      {
        source: "/cancellation-and-refund",
        destination: "/terms-of-service#cancellation-and-refund",
        permanent: false,
      },
    ];
  },
});

const sentryConfig = {
  org: "rateup",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  // tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
};
const withNextIntl = createNextIntlPlugin({
  experimental: {
    // Provide the path to the messages that you're using in `AppConfig`
    createMessagesDeclaration: "./dictionaries/en.json",
  },
});

const config = withSentryConfig(withNextIntl(nextConfig), sentryConfig);

export default config;
