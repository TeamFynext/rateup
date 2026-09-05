import { Link } from "@tanstack/react-router";

import { ClosingCta } from "@/components/RateupHomePage/shared/home-ui";
import { getIntegrationBySlug } from "@/config/integrations";

import { Band, FaqList, FeatureGrid, LandingHero, RelatedLinks, Steps } from "./sections";
import type { Faq, FeatureItem, Step } from "./sections";

/**
 * `/integrations/shopify`.
 *
 * RateUp has been listed on the Shopify App Store, and five blog posts target Shopify retention,
 * but the site had no Shopify page for any of it to link to — and `/pricing/shopify`, a billing
 * OAuth callback, was squatting on the obvious URL. This is the page that URL should have been.
 */

const APP_STORE_URL =
  getIntegrationBySlug("shopify")?.marketplaceUrl ?? "https://apps.shopify.com/rateup";

const FEATURES: readonly FeatureItem[] = [
  {
    title: "Orders and customers, synced",
    body: "Every order, customer and refund flows into RateUp as it happens. Contacts stay current without a CSV, and campaigns can be segmented by what someone actually bought.",
    icon: (
      <>
        <path d="M4 7h16v13H4z" />
        <path d="M8 7V5a4 4 0 0 1 8 0v2" />
      </>
    ),
  },
  {
    title: "Loyalty points on every order",
    body: "Points post automatically when an order is paid and can be redeemed as a discount at checkout. No stamp cards, no app for the customer to install.",
    icon: (
      <>
        <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8z" />
      </>
    ),
  },
  {
    title: "Abandoned-cart recovery",
    body: "A WhatsApp nudge with the cart contents and a one-tap link back to checkout, sent on your own schedule — read where an email would sit unopened.",
    icon: (
      <>
        <path d="M3 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L20 8H6" />
        <circle cx="10" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
      </>
    ),
  },
  {
    title: "COD order confirmation",
    body: "Confirm cash-on-delivery orders on WhatsApp before they ship. Unconfirmed orders are the ones that come back as RTO, and this is the cheapest place to catch them.",
    icon: (
      <>
        <path d="M3 7h13v10H3z" />
        <path d="M16 10h3.5L21 13v4h-5" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="17.5" cy="18" r="1.6" />
      </>
    ),
  },
  {
    title: "Post-purchase feedback",
    body: "A delivery-triggered survey that renders as a native form inside WhatsApp with Flows, so the response rate is not what you are used to from email.",
    icon: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M9 9h6M9 13h6M9 17h3" />
      </>
    ),
  },
  {
    title: "One shared inbox",
    body: "Pre-sales questions, order chases and support all land in the same place, with the customer's Shopify order history next to the conversation.",
    icon: (
      <>
        <path d="M4 5h16v11H8l-4 3z" />
        <path d="M8 9h8M8 12h5" />
      </>
    ),
  },
];

const STEPS: readonly Step[] = [
  {
    title: "Install from the Shopify App Store",
    body: "One click from the listing. RateUp asks for the order and customer scopes it needs and nothing else.",
  },
  {
    title: "Connect your WhatsApp number",
    body: "Meta's Embedded Signup runs inside RateUp. Use a new number or migrate the one you already answer on.",
  },
  {
    title: "Turn on the flows you want",
    body: "Abandoned cart, COD confirmation, delivery feedback and loyalty each toggle on with a default message you can edit.",
  },
  {
    title: "Watch it in the dashboard",
    body: "Recovered carts, confirmed COD orders, points issued and responses collected, attributed back to the campaign that produced them.",
  },
];

export const SHOPIFY_FAQS: readonly Faq[] = [
  {
    question: "How do I install RateUp on Shopify?",
    answer:
      "Install it from the RateUp listing on the Shopify App Store. Approving the permissions connects your store, imports your existing customers and orders, and starts syncing new ones. Connecting your WhatsApp number is a separate one-time step inside RateUp.",
  },
  {
    question: "What data does RateUp read from my store?",
    answer:
      "Orders, customers and product details — the fields needed to segment campaigns, award loyalty points and personalise messages. RateUp does not read payment credentials, and you can disconnect the app at any time from Shopify's admin.",
  },
  {
    question: "Can I recover abandoned carts on WhatsApp?",
    answer:
      "Yes. When a checkout is abandoned, RateUp can send a WhatsApp template with the cart contents and a link straight back to checkout, after a delay you choose. Because it is an approved template on the official API, it reaches people whether or not they have saved your number.",
  },
  {
    question: "Does it work for cash-on-delivery orders?",
    answer:
      "Yes, and this is where most Indian stores see the fastest return. RateUp messages the customer to confirm a COD order before it ships, and flags the ones that go unconfirmed so you can hold them rather than pay shipping both ways. Our RTO loss calculator puts a figure on what that is currently costing you.",
  },
  {
    question: "How do loyalty points work with Shopify discounts?",
    answer:
      "Points accrue when an order is paid and are redeemed as a Shopify discount code generated at redemption, so the discount shows up in your Shopify reporting like any other. Earning and redemption rules, tiers and expiry are all set in RateUp.",
  },
  {
    question: "Do I need a separate WhatsApp Business API account?",
    answer:
      "No. RateUp is a Meta Business Solution Provider, so the API account is provisioned through Embedded Signup during setup. You do not need to apply to Meta separately or hold your own BSP contract.",
  },
];

const RELATED = [
  {
    to: "/integrations",
    label: "All integrations",
    body: "WooCommerce, Petpooja, Zoho, Zapier and the REST API.",
  },
  {
    to: "/tools/rto-loss-calculator",
    label: "RTO loss calculator",
    body: "What cash-on-delivery returns are costing you each month.",
  },
  {
    to: "/products/whatsapp-loyalty",
    label: "WhatsApp Loyalty",
    body: "Points, tiers and referrals on the orders you already take.",
  },
  {
    to: "/products/whatsapp-broadcast",
    label: "WhatsApp Broadcast",
    body: "Campaigns segmented by purchase history.",
  },
] as const;

const BagIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
    aria-hidden="true"
  >
    <path d="M4 7h16v13H4z" />
    <path d="M8 7V5a4 4 0 0 1 8 0v2" />
  </svg>
);

export default function ShopifyIntegrationPage() {
  return (
    <>
      <LandingHero
        eyebrow="Shopify"
        eyebrowIcon={BagIcon}
        title="Shopify WhatsApp Integration: Loyalty, Feedback & Broadcasts"
        points={["One-click install", "Two-way order sync", "Live the same day"]}
      >
        Install RateUp from the Shopify App Store and your store starts talking to WhatsApp: points
        on every order, carts chased where people actually read, COD orders confirmed before they
        ship, and feedback collected the day a parcel lands.
      </LandingHero>

      <Band
        eyebrow="What it does"
        eyebrowIcon={BagIcon}
        title="Six things your store starts doing on WhatsApp."
        lead="Each one is driven by an event Shopify already emits — an order paid, a checkout abandoned, a fulfilment delivered — so nothing needs a human to trigger it."
      >
        <FeatureGrid items={FEATURES} />
      </Band>

      <Band
        tone="muted"
        eyebrow="Setup"
        eyebrowIcon={BagIcon}
        title="Four steps, and most stores are live the same day."
      >
        <Steps steps={STEPS} />
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-13.5 items-center gap-2.5 rounded-lg bg-ru-blue-600 px-7 text-[17px] font-semibold text-white shadow-[0_8px_22px_rgba(28,81,142,0.2)] transition-colors hover:bg-ru-blue-700"
          >
            Install from the Shopify App Store
          </a>
        </div>
      </Band>

      <Band
        eyebrow="Cash on delivery"
        eyebrowIcon={BagIcon}
        title="The COD orders nobody confirms are the ones that come back."
        lead={
          <>
            Return-to-origin costs you shipping both ways, the packaging and the working capital the
            order tied up. Confirming on WhatsApp before dispatch is the cheapest place to catch it
            — the{" "}
            <Link
              to="/tools/rto-loss-calculator"
              className="font-semibold text-ru-blue-600 underline underline-offset-2"
            >
              RTO loss calculator
            </Link>{" "}
            will tell you what a few points of improvement is worth on your own volumes.
          </>
        }
      />

      <Band tone="muted" title="Shopify integration questions, answered.">
        <FaqList faqs={SHOPIFY_FAQS} />
      </Band>

      <Band title="Where to go next">
        <RelatedLinks links={RELATED} />
      </Band>

      <ClosingCta eyebrow="On the Shopify App Store" title="Connect your store in a few minutes.">
        Install the app, connect a WhatsApp number and switch on the flows you want. The free plan
        is enough to see whether the carts come back.
      </ClosingCta>
    </>
  );
}
