import IntegrationBand from "../shared/IntegrationBand";

const API_MARK = <span className="font-mono text-sm font-bold text-ru-n-500">{"{ }"}</span>;

const AGENT_MARK = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    className="size-5.5 text-ru-blue-600"
    aria-hidden="true"
  >
    <rect x="4" y="7" width="16" height="12" rx="3" />
    <path d="M12 7V4M9 12h.01M15 12h.01M9.5 15.5h5" />
  </svg>
);

export default function Integrations() {
  return (
    <IntegrationBand
      title="Points from wherever you sell."
      lead="Online orders, the counter and your POS all feed the same programme."
      points={[
        {
          name: "Shopify",
          slug: "shopify",
          body: "Paid orders award points and cancelled ones take them back. Rewards become Shopify discount codes.",
        },
        {
          name: "WooCommerce",
          slug: "woocommerce",
          body: "Award loyalty points on paid WooCommerce orders.",
        },
        {
          name: "REST API for your POS",
          body: "Look up and create members, award or adjust points, and issue or redeem rewards — with scoped API keys and safe retries.",
          mark: API_MARK,
        },
        {
          name: "Meta AI Agent",
          body: "Members can ask the AI agent on WhatsApp for their balance and rewards.",
          mark: AGENT_MARK,
        },
      ]}
    />
  );
}
