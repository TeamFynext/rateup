import type { RedirectRule } from "./index.ts";

const blogRedirects: Record<string, RedirectRule> = {
  "/blog/whatsapp-based-loyalty-programs-the-smartest-way-to-reward-customers-in-2025": {
    to: "/blog/whatsapp-based-loyalty-programs-the-smartest-way-to-reward-customers",
    statusCode: 301,
  },
};

export default blogRedirects;
