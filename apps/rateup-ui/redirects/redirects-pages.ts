import type { RedirectRule } from "./index.ts";

const pageRedirects: Record<string, RedirectRule> = {
  "/shipping-and-delivery": {
    to: "/terms-of-service#shipping-and-delivery",
    statusCode: 302,
  },
  "/cancellation-and-refund": {
    to: "/terms-of-service#cancellation-and-refund",
    statusCode: 302,
  },
  "/blog/about": {
    to: "/blog",
    statusCode: 301,
  },
};

export default pageRedirects;
