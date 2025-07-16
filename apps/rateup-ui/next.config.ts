import type { NextConfig } from "next";

import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = bundleAnalyzer({
  i18n: {
    locales: ["en", "de", "fr", "ar", "hi"],
    defaultLocale: "en",
  },
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
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
  compiler:
    process.env.NODE_ENV === "production"
      ? {
          removeConsole: true,
        }
      : {},
  experimental: {
    // reactCompiler: true,
  },
  webpack: (config) => {
    // '...' is important here – it keeps the default webpack conditionNames
    config.resolve.conditionNames = ["require", "..."];
    return config;
  },
  transpilePackages: ["@mui/x-data-grid"],
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

const config = withSentryConfig(nextConfig, sentryConfig);

export default config;
