import type { ReactNode } from "react";

import IntegrationBand from "../shared/IntegrationBand";

function Mark({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5.5 text-ru-blue-600"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export default function Integrations() {
  return (
    <IntegrationBand
      title="Plugs into the store you already run."
      lead="Keep Shopify or WooCommerce as your source of truth, take payment through your own provider and ship with EasyPost."
      points={[
        {
          name: "Shopify",
          slug: "shopify",
          body: "Products are mirrored into RateUp and published to your Meta catalog. Paid chat orders are written back to Shopify.",
        },
        {
          name: "WooCommerce",
          slug: "woocommerce",
          body: "Your WooCommerce products are mirrored in, ready to send in chats and publish to the Meta catalog.",
        },
        {
          name: "Stripe & Razorpay",
          body: "Connect your own account. Payment links and the hosted checkout charge through it, straight to you.",
          mark: (
            <Mark>
              <rect x="3" y="5.5" width="18" height="13" rx="2" />
              <path d="M3 10h18M7 14.5h4" />
            </Mark>
          ),
        },
        {
          name: "EasyPost",
          body: "Live shipping rates, labels and automatic tracking updates across most carriers.",
          mark: (
            <Mark>
              <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
              <path d="m3 7.5 9 4.5 9-4.5M12 12v9" />
            </Mark>
          ),
        },
      ]}
    />
  );
}
