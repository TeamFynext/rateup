import type { NextConfig } from "next";

import { SentryBuildOptions, withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

import redirects from "./redirects";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // typedRoutes: true,
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
    qualities: [25, 50, 60, 75],
  },
  htmlLimitedBots: /.*/,
  compiler:
    process.env.NODE_ENV === "production"
      ? {
          removeConsole: true,
        }
      : {},
  // reactCompiler: true,
  turbopack: { resolveAlias: { html2canvas: "html2canvas-pro" } },
  experimental: {
    // optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
    useLightningcss: true,
  },
  async redirects() {
    return redirects;
  },
  async headers() {
    return [
      {
        source: "/", // homepage only
        headers: [
          {
            key: "Link",
            value:
              '</.well-known/api-catalog>; rel="api-catalog", <https://docs.rateup.app>; rel="service-doc"',
          },
        ],
      },
    ];
  },
};

const sentryConfig: SentryBuildOptions = {
  org: "rateup",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    reactComponentAnnotation: {
      enabled: true,
    },
    treeshake: {
      removeDebugLogging: true,
    },
  },
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
};
const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: "./dictionaries/en.json",

    // Relative path(s) to source files
    srcPath: "./",

    extract: {
      // Defines which locale to extract to
      sourceLocale: "en",
    },

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
