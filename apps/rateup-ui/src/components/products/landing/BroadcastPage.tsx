import { Link } from "@tanstack/react-router";

import { ClosingCta } from "@/components/RateupHomePage/shared/home-ui";

import { Band, FeatureGrid, FaqList, LandingHero, RelatedLinks, Steps } from "./sections";
import type { FeatureItem, Faq, Step } from "./sections";

/**
 * `/products/whatsapp-broadcast`.
 *
 * The word "broadcast" appeared nowhere in the site's rendered HTML before this page — only in
 * the LLM markdown variants — while campaigns shipped as a dashboard feature with no marketing
 * surface at all. This is that surface.
 */

const HERO_POINTS = [
  "No 256-contact limit",
  "Meta-approved templates",
  "Opt-out handled for you",
] as const;

export const BROADCAST_FEATURES: readonly FeatureItem[] = [
  {
    title: "Segmented, not shouted",
    body: "Build audiences from order history, loyalty tier, city, last-purchase date or any custom attribute, and send each segment its own message instead of one blast to everyone.",
    icon: (
      <>
        <path d="M4 6h16M7 12h10M10 18h4" />
      </>
    ),
  },
  {
    title: "Template approval, tracked",
    body: "Draft, submit and track Meta template approvals from inside RateUp. You see the rejection reason and can resubmit without leaving the campaign.",
    icon: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
  },
  {
    title: "Schedule and stagger",
    body: "Pick a send window per campaign, or let RateUp stagger delivery so a large list does not land in one spike — useful when your support team has to answer the replies.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    title: "Opt-in and opt-out compliance",
    body: "Consent is recorded per contact, STOP replies unsubscribe automatically, and opted-out contacts are excluded from every future send. That is what keeps your quality rating healthy.",
    icon: (
      <>
        <path d="M12 3 4 6.5V12c0 4.5 3.2 7.9 8 9 4.8-1.1 8-4.5 8-9V6.5z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    title: "Delivery and read analytics",
    body: "Sent, delivered, read, replied and clicked, per campaign and per segment — plus the revenue attributed to each send when your store is connected.",
    icon: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
  },
  {
    title: "Per-message pricing, up front",
    body: "Meta charges per message by category and country. RateUp shows the estimated cost of a campaign before you send it, using the same rates as our pricing calculator.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9.5 9.5h4a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4h4" />
      </>
    ),
  },
];

const STEPS: readonly Step[] = [
  {
    title: "Connect your number",
    body: "Onboard your business number to the official WhatsApp Business API through Meta's Embedded Signup. It takes minutes and you keep the number you already use.",
  },
  {
    title: "Build the audience",
    body: "Import a list, or filter contacts you already hold by order history, loyalty tier or any attribute you sync from your store or POS.",
  },
  {
    title: "Get the template approved",
    body: "Write the message, add variables and media, and submit it to Meta from inside RateUp. Approvals usually land within a few minutes.",
  },
  {
    title: "Send, then read the numbers",
    body: "Schedule the campaign, watch delivery and read rates as it goes out, and pick up replies in the shared inbox rather than on someone's phone.",
  },
];

export const BROADCAST_FAQS: readonly Faq[] = [
  {
    question: "How many messages can I broadcast at once?",
    answer:
      "There is no 256-contact cap on the WhatsApp Business API — that limit belongs to the broadcast lists in the free WhatsApp Business app. On the API your ceiling is your messaging tier, which starts at 1,000 unique customers per 24 hours on a new number and steps up to 10,000, 100,000 and then unlimited as you send quality traffic. RateUp queues sends against your current tier so a large campaign goes out without breaching it.",
  },
  {
    question: "Will my number get banned for broadcasting?",
    answer:
      "Not for broadcasting itself. Numbers get restricted when people block or report them, which is what drives your quality rating down. Sending only to contacts who opted in, honouring opt-outs, using an approved template that matches what people expect, and keeping to a relevant frequency is what keeps the rating green. RateUp records consent per contact, unsubscribes on STOP replies and excludes opted-out contacts from every send.",
  },
  {
    question: "What is the difference between this and a WhatsApp Business app broadcast list?",
    answer:
      "A broadcast list in the free app sends to at most 256 contacts, only reaches people who have saved your number, and gives you no delivery reporting. The WhatsApp Business API has none of those limits: it reaches anyone who has opted in, scales to your messaging tier, supports rich templates with media and buttons, and reports delivery, reads and replies per message.",
  },
  {
    question: "What does a WhatsApp broadcast cost?",
    answer:
      "Meta charges per message, priced by category (marketing, utility, authentication) and by the recipient's country. RateUp's subscription is a flat monthly fee and the per-message cost is passed through at Meta's rate. Our WhatsApp pricing calculator gives you a monthly figure for your own volume and countries.",
  },
  {
    question: "Do recipients have to save my number first?",
    answer:
      "No. On the official API a template message reaches an opted-in contact whether or not they have saved the number — unlike a broadcast list in the free app, which only reaches contacts who have saved you.",
  },
  {
    question: "Can I broadcast to customers who have not opted in?",
    answer:
      "No, and you should not want to. Meta's Business Messaging Policy requires prior opt-in, and messaging people who did not ask for it is the fastest way to get blocked and lose your quality rating. RateUp collects opt-in through QR codes, checkout, click-to-chat links and loyalty signup, and records where and when each consent was given.",
  },
];

const RELATED = [
  {
    to: "/products/whatsapp-business-api",
    label: "WhatsApp Business API",
    body: "What the API is, how to get access, and what Meta charges.",
  },
  {
    to: "/tools/whatsapp-pricing-calculator",
    label: "Pricing calculator",
    body: "Estimate your monthly per-message cost by country and category.",
  },
  {
    to: "/products/whatsapp-loyalty",
    label: "WhatsApp Loyalty",
    body: "Give the people you broadcast to a reason to come back.",
  },
  {
    to: "/integrations/shopify",
    label: "Shopify integration",
    body: "Abandoned-cart and COD confirmation broadcasts, triggered by your store.",
  },
] as const;

const MegaphoneIcon = (
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
    <path d="M3 11v2a1 1 0 0 0 1 1h3l7 4V6l-7 4H4a1 1 0 0 0-1 1Z" />
    <path d="M18 9a3.5 3.5 0 0 1 0 6" />
  </svg>
);

export default function BroadcastPage() {
  return (
    <>
      <LandingHero
        eyebrow="Campaigns"
        eyebrowIcon={MegaphoneIcon}
        title="WhatsApp Broadcast Software on the Official Business API"
        points={HERO_POINTS}
      >
        Reach thousands of customers in the app they actually read, with segmentation, approved
        templates, scheduling and delivery analytics — on Meta's official API, not a browser
        automation that gets your number banned.
      </LandingHero>

      <Band
        eyebrow="What you get"
        eyebrowIcon={MegaphoneIcon}
        title="Everything a real broadcast needs, and nothing that risks your number."
        lead="Bulk sending is the easy part. The parts that decide whether your campaigns keep working are segmentation, template approval, consent and measurement — so those are the parts RateUp is built around."
      >
        <FeatureGrid items={BROADCAST_FEATURES} />
      </Band>

      <Band
        tone="muted"
        eyebrow="How it works"
        eyebrowIcon={MegaphoneIcon}
        title="From a phone number to a measured campaign, in four steps."
      >
        <Steps steps={STEPS} />
      </Band>

      <Band
        eyebrow="Pricing"
        eyebrowIcon={MegaphoneIcon}
        title="You pay RateUp a flat fee, and Meta per message."
        lead={
          <>
            RateUp's subscription does not meter your broadcasts. Meta's per-message rate depends on
            the message category and the recipient's country — put your own volumes into the{" "}
            <Link
              to="/tools/whatsapp-pricing-calculator"
              className="font-semibold text-ru-blue-600 underline underline-offset-2"
            >
              WhatsApp pricing calculator
            </Link>{" "}
            for a monthly figure, or see the{" "}
            <Link
              to="/pricing"
              className="font-semibold text-ru-blue-600 underline underline-offset-2"
            >
              plan comparison
            </Link>
            .
          </>
        }
      />

      <Band tone="muted" title="WhatsApp broadcast questions, answered.">
        <FaqList faqs={BROADCAST_FAQS} />
      </Band>

      <Band title="Where to go next">
        <RelatedLinks links={RELATED} />
      </Band>

      <ClosingCta eyebrow="Start free" title="Send your first WhatsApp campaign this week.">
        Connect your number, import your list and get a template approved — most teams are sending
        their first broadcast the same day they sign up.
      </ClosingCta>
    </>
  );
}
