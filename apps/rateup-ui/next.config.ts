import type { NextConfig } from "next";

import { SentryBuildOptions, withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

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
  async redirects(): Promise<any> {
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
      {
        source:
          "/blog/whatsapp-based-loyalty-programs-the-smartest-way-to-reward-customers-in-2025",
        destination:
          "/blog/whatsapp-based-loyalty-programs-the-smartest-way-to-reward-customers",
        permanent: true,
        statusCode: 301,
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
