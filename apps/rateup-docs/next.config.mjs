import nextra from "nextra";

const withNextra = nextra({});

export default withNextra({
  htmlLimitedBots: /.*/,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "djd7kjh9uwow0.cloudfront.net",
        port: "",
      },
      {
        protocol: "https",
        hostname: "d2uj946b0i8y27.cloudfront.net",
      },
    ],
  },
});
