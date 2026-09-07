/**
 * Copy and data for `/products/whatsapp-business-api`.
 *
 * The FAQ array is the reason this file exists separately from the markup: the route builds the
 * page's `FAQPage` JSON-LD from the same six questions the accordion renders, so the structured
 * data can never describe an answer the page does not show.
 */

export interface BusinessApiFaq {
  question: string;
  answer: string;
}

export const BUSINESS_API_FAQS: readonly BusinessApiFaq[] = [
  {
    question: "Is the WhatsApp Business API free?",
    answer:
      "The API itself has no licence fee, but Meta charges a per-message fee for delivered template messages, priced by category and country. RateUp's own plan starts free, so your only cost at low volume is Meta's message fee.",
  },
  {
    question: "Do I need a separate BSP account?",
    answer:
      "No. RateUp handles the connection during onboarding — typically within 24 hours — so you never sign up with a separate Business Solution Provider.",
  },
  {
    question: "Can I keep my existing WhatsApp number?",
    answer:
      "Yes, as long as it isn't currently registered to a WhatsApp Business App account. If it is, you delete that account first and the number is then free to connect to the API.",
  },
  {
    question: "What is Meta Business verification and do I need it?",
    answer:
      "It's Meta confirming your business is real, done in Meta Business Manager. You can start messaging without it, but verification unlocks higher messaging limits and the verified business name customers see in the chat header.",
  },
  {
    question: "Can multiple people reply from the same number?",
    answer:
      "Yes. That's the main reason teams move to the API: unlimited seats on one number, with conversations assigned to users or teams instead of sitting on one phone.",
  },
  {
    question: "Can I connect more than one number or branch?",
    answer:
      "Yes. Connect several numbers to the same workspace and keep each branch's inbox, templates and reporting separate.",
  },
];

/** App vs API. The third column is the highlighted one. */
export const APP_VS_API: readonly (readonly [string, string, string])[] = [
  ["Users per number", "1 device", "Unlimited team seats"],
  ["Broadcast reach", "256 saved contacts", "Unlimited, with approved templates"],
  ["Automation", "Basic away message", "Triggers, chatbots and Flows"],
  ["Verification", "None", "Verified business name"],
  ["Catalog & payments", "Manual, shared by hand", "In-chat cart and checkout"],
  ["Reporting", "None", "Delivery, read, campaign and agent analytics"],
];

export const API_STATS = [
  {
    value: "98%",
    label: "open rate",
    note: "Measured across RateUp retail accounts on broadcast templates",
  },
  {
    value: "10",
    label: "starter templates",
    note: "Order paid, shipped, cancelled, abandoned checkout and more — ready to submit",
  },
  {
    value: "3 → 1",
    label: "channels, one inbox",
    note: "WhatsApp, Instagram and Messenger in a single queue",
  },
] as const;

export const API_TABS = [
  "Templates & Flows",
  "Catalog & Payments",
  "Inbox & Automation",
  "AI Agent",
] as const;

export type ApiTab = (typeof API_TABS)[number];
