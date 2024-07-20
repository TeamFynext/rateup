const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer({
  i18n: {
    locales: ["en", "de", "fr", "ar", "hi"], // Languages we can add here
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
    ],
  },
  compiler:
    process.env.NODE_ENV === "production"
      ? {
          removeConsole: true,
        }
      : {},
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
