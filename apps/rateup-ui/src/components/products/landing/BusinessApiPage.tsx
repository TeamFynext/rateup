import { Link } from "@tanstack/react-router";

import { ClosingCta } from "@/components/RateupHomePage/shared/home-ui";

import {
  Band,
  CompareTable,
  FaqList,
  FeatureGrid,
  LandingHero,
  RelatedLinks,
  Steps,
} from "./sections";
import type { Faq, FeatureItem, Step } from "./sections";

/**
 * `/products/whatsapp-business-api`.
 *
 * "WhatsApp Business API" is the most-repeated phrase in the site's metadata — it is in the title
 * or description of a dozen pages — and until this page there was no H1 anywhere that targeted it.
 * This is the hub: it explains the thing, then links out to every product page that uses it, so
 * the cluster has a centre.
 */

const HERO_POINTS = [
  "Official Meta Business Partner",
  "Embedded Signup onboarding",
  "Keep your existing number",
] as const;

const CAPABILITIES: readonly FeatureItem[] = [
  {
    title: "Broadcast campaigns",
    body: "Segmented sends to thousands of opted-in customers, with approved templates and per-campaign delivery reporting.",
    icon: (
      <>
        <path d="M3 11v2a1 1 0 0 0 1 1h3l7 4V6l-7 4H4a1 1 0 0 0-1 1Z" />
        <path d="M18 9a3.5 3.5 0 0 1 0 6" />
      </>
    ),
  },
  {
    title: "A shared team inbox",
    body: "Every conversation in one place, assigned to a person rather than living on somebody's phone — with WhatsApp, Instagram and Messenger side by side.",
    icon: (
      <>
        <path d="M4 5h16v11H8l-4 3z" />
        <path d="M8 9h8M8 12h5" />
      </>
    ),
  },
  {
    title: "Automation and chatbots",
    body: "No-code flows that qualify leads, answer the questions your team answers fifty times a day, and hand over to a human when it matters.",
    icon: (
      <>
        <rect x="4" y="8" width="16" height="11" rx="2" />
        <path d="M12 8V4M8 13h.01M16 13h.01" />
      </>
    ),
  },
  {
    title: "Native forms with Flows",
    body: "WhatsApp Flows render a real multi-step form inside the chat, so a survey or an order form is completed without ever leaving the app.",
    icon: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M9 9h6M9 13h6M9 17h3" />
      </>
    ),
  },
  {
    title: "Loyalty without an app",
    body: "Points, tiers and referrals that live in a chat thread, so customers never download anything and never lose a stamp card.",
    icon: (
      <>
        <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8z" />
      </>
    ),
  },
  {
    title: "Order and delivery updates",
    body: "Utility templates for confirmations, shipping updates and COD verification, triggered straight from your store or ERP.",
    icon: (
      <>
        <path d="M3 7h13v10H3z" />
        <path d="M16 10h3.5L21 13v4h-5" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="17.5" cy="18" r="1.6" />
      </>
    ),
  },
];

const APP_VS_API = {
  columns: ["", "WhatsApp Business app", "WhatsApp Business API"] as const,
  rows: [
    [
      "Who it is for",
      "One person on one phone",
      "A team, and any system that needs to send messages",
    ],
    ["Users at once", "One device, plus linked devices", "Unlimited agents in a shared inbox"],
    ["Broadcast size", "256 saved contacts per list", "Your messaging tier — 1,000/day upwards"],
    [
      "Reaching people",
      "Only contacts who saved your number",
      "Anyone who has opted in, saved or not",
    ],
    ["Automation", "Away messages and quick replies", "Full chatbots, flows and system triggers"],
    ["Integrations", "None", "Store, POS, CRM, webhooks and a REST API"],
    ["Reporting", "Message counts", "Delivery, read, reply and revenue per campaign"],
    ["Cost", "Free", "Per message, by category and country"],
  ] as const,
};

const ONBOARDING: readonly Step[] = [
  {
    title: "Pick the number",
    body: "Use a new number, or the one you already run on the WhatsApp Business app — that one has to be migrated off the app first, which we walk you through.",
  },
  {
    title: "Run Embedded Signup",
    body: "Meta's Embedded Signup opens in a popup, you approve the permissions with your Facebook Business account, and the number is provisioned. No paperwork.",
  },
  {
    title: "Verify the business",
    body: "Meta Business Verification unlocks higher messaging tiers and the green tick. It needs your registration documents, and typically clears in a few days.",
  },
  {
    title: "Get your first templates approved",
    body: "Submit the messages you want to send. Utility and authentication templates usually approve in minutes; marketing templates get more scrutiny.",
  },
];

export const BUSINESS_API_FAQS: readonly Faq[] = [
  {
    question: "What is the WhatsApp Business API?",
    answer:
      "It is the interface Meta provides so software can send and receive WhatsApp messages on behalf of a business. Unlike the free WhatsApp Business app, it has no single-phone limit, supports a whole team in one inbox, connects to your store, CRM and POS, and reports delivery for every message. There is no app to install for the API itself — you use it through a platform like RateUp.",
  },
  {
    question: "How is it different from the WhatsApp Business app?",
    answer:
      "The app is one person on one phone with broadcast lists capped at 256 saved contacts. The API is built for teams and systems: unlimited agents in a shared inbox, broadcasts limited only by your messaging tier, automation, integrations and full delivery reporting. The app is free; the API bills per message.",
  },
  {
    question: "How do I get access to the WhatsApp Business API?",
    answer:
      "Through a Meta Business Solution Provider. RateUp is one: you run Meta's Embedded Signup from inside RateUp, approve the permissions with your Facebook Business account, and your number is provisioned — usually within minutes rather than the multi-week application process the API used to require.",
  },
  {
    question: "What does the WhatsApp Business API cost?",
    answer:
      "Meta charges per message, priced by category — marketing, utility and authentication — and by the recipient's country. On top of that you pay your provider. RateUp charges a flat monthly subscription rather than a per-message markup. Our pricing calculator turns your own volume and countries into a monthly figure.",
  },
  {
    question: "Can I keep my existing WhatsApp number?",
    answer:
      "Yes. A number currently on the WhatsApp Business app can be migrated to the API, which deletes the chat history on the phone but keeps the number, the display name and the profile. A number on the regular consumer WhatsApp app has to be deleted from it first.",
  },
  {
    question: "Do I need Meta Business Verification?",
    answer:
      "You can start sending on an unverified number at the lowest messaging tier. Verification lifts your limits, is required for the green official-business tick, and needs your business registration documents. Most businesses clear it within a few days.",
  },
  {
    question: "What is a message template and why does Meta approve them?",
    answer:
      "Any message you send outside a 24-hour customer service window has to use a template Meta has approved in advance. That is what stops the channel filling with spam. Templates support variables, media, buttons and quick replies; you draft and submit them from inside RateUp and see the rejection reason if one comes back.",
  },
  {
    question: "What is the 24-hour customer service window?",
    answer:
      "When a customer messages you, a 24-hour window opens in which you can reply with any free-form message at no per-message charge. Outside that window you need an approved template, and the message is billed at Meta's rate for its category.",
  },
];

const RELATED = [
  {
    to: "/products/whatsapp-broadcast",
    label: "WhatsApp Broadcast",
    body: "Segmented campaigns to thousands, on the official API.",
  },
  {
    to: "/products/whatsapp-loyalty",
    label: "WhatsApp Loyalty",
    body: "Points, tiers and referrals with no app to download.",
  },
  {
    to: "/products/whatsapp-feedback",
    label: "WhatsApp Feedback",
    body: "Native in-chat forms with WhatsApp Flows.",
  },
  {
    to: "/products/omnichannel-inbox",
    label: "Omnichannel Inbox",
    body: "WhatsApp, Instagram and Messenger in one shared workspace.",
  },
  {
    to: "/products/ai-automation",
    label: "AI Automation",
    body: "No-code chat flows that qualify and answer around the clock.",
  },
  {
    to: "/tools/whatsapp-pricing-calculator",
    label: "Pricing calculator",
    body: "What Meta will charge you per month, by country.",
  },
] as const;

const ApiIcon = (
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
    <path d="M8 4 4 12l4 8M16 4l4 8-4 8M13.5 6l-3 12" />
  </svg>
);

export default function BusinessApiPage() {
  return (
    <>
      <LandingHero
        eyebrow="Platform"
        eyebrowIcon={ApiIcon}
        title="WhatsApp Business API for Business — Official Meta Partner"
        points={HERO_POINTS}
      >
        Everything the API actually gives you: how it differs from the free WhatsApp Business app,
        how to get onboarded in minutes through Embedded Signup, what Meta charges per message, and
        what businesses build on it.
      </LandingHero>

      <Band
        eyebrow="What it is"
        eyebrowIcon={ApiIcon}
        title="The interface that lets your software message on WhatsApp."
        lead="The WhatsApp Business API is not an app you install. It is the channel Meta opens so a platform — RateUp, in this case — can send and receive messages for your business: to a whole team, from your store and CRM, at a scale the free app cannot reach, with delivery reporting on every message."
      >
        <FeatureGrid items={CAPABILITIES} />
      </Band>

      <Band
        tone="muted"
        eyebrow="App vs API"
        eyebrowIcon={ApiIcon}
        title="Which one you need depends on whether one phone is enough."
        lead="If a single person answers every message and you never broadcast to more than a couple of hundred people, the free app is fine. Everything past that is what the API is for."
      >
        <CompareTable
          columns={APP_VS_API.columns}
          rows={APP_VS_API.rows}
          caption="Feature comparison between the free WhatsApp Business app and the WhatsApp Business API"
        />
      </Band>

      <Band
        eyebrow="Getting access"
        eyebrowIcon={ApiIcon}
        title="Onboarding takes minutes, not weeks."
        lead="The API used to mean an application form and a wait. Meta's Embedded Signup replaced that: you approve the permissions in a popup and the number is provisioned."
      >
        <Steps steps={ONBOARDING} />
      </Band>

      <Band
        tone="muted"
        eyebrow="Pricing"
        eyebrowIcon={ApiIcon}
        title="Meta bills per message. We bill a flat monthly fee."
        lead={
          <>
            Meta's rate depends on the message category — marketing, utility or authentication — and
            on the recipient's country, and conversations a customer starts are free for 24 hours.
            Our{" "}
            <Link
              to="/tools/whatsapp-pricing-calculator"
              className="font-semibold text-ru-blue-600 underline underline-offset-2"
            >
              WhatsApp Business API pricing calculator
            </Link>{" "}
            turns your volume and countries into a monthly figure at Meta's published rates, and{" "}
            <Link
              to="/pricing"
              className="font-semibold text-ru-blue-600 underline underline-offset-2"
            >
              RateUp's own pricing
            </Link>{" "}
            does not meter your messages.
          </>
        }
      />

      <Band title="WhatsApp Business API questions, answered.">
        <FaqList faqs={BUSINESS_API_FAQS} />
      </Band>

      <Band tone="muted" title="What businesses build on it">
        <RelatedLinks links={RELATED} />
      </Band>

      <ClosingCta eyebrow="Official Meta Business Partner" title="Get on the API this week.">
        Run Embedded Signup, keep the number you already use, and start with the free plan — no
        application form and no waiting list.
      </ClosingCta>
    </>
  );
}
