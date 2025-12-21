import type { NextConfig } from "next";

import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // typedRoutes: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "djd7kjh9uwow0.cloudfront.net",
        port: "",
      },
      {
        protocol: "http",
        hostname: "d2uj946b0i8y27.cloudfront.net",
        // pathname: "/**",
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
      {
        source: "/blog/about",
        destination: "blog",
        permanent: true,
      },
    ];
  },
};

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
    // Relative path(s) to source files
    srcPath: "./",

    // extract: {
    //   // Defines which locale to extract to
    //   sourceLocale: "en",
    // },

    messages: {
      // Relative path to the directory
      path: "./dictionaries",

      // Either 'json', 'po', or a custom format (see below)
      format: "json",

      // Either 'infer' to automatically detect locales based on
      // matching files in `path` or an explicit array of locales
      locales: "infer",
    },
  },
});

const config = withSentryConfig(withNextIntl(nextConfig), sentryConfig);

export default config;
