/**
 * Copy and data for `/products/whatsapp-broadcast`, kept apart from the markup.
 *
 * The FAQ array is the reason this file exists: the route builds the page's `FAQPage` JSON-LD
 * from the same array the accordion renders, so the structured data can never claim an answer
 * the page does not show.
 */

export interface BroadcastFaq {
  question: string;
  answer: string;
}

export const BROADCAST_FAQS: readonly BroadcastFaq[] = [
  {
    question: "How many people can I broadcast to on WhatsApp?",
    answer:
      "On the WhatsApp Business App a broadcast list caps at 256 contacts, and only people who saved your number will receive it. On the official Business API through RateUp there is no recipient cap — you send to your whole contact list, dispatched in batches of 5,000 messages. Your monthly conversation allowance and Meta's per-message pricing are the only real limits.",
  },
  {
    question: "Will my number get banned for broadcasting?",
    answer:
      "Not for broadcasting on the official API with approved templates from your own verified number. Bans happen to unofficial bulk senders and modded apps, which breach Meta's terms outright. Keep the consent gate on, send templates people expect, and your quality rating stays healthy.",
  },
  {
    question: "Do customers need to save my number?",
    answer:
      "No. That requirement belongs to broadcast lists in the WhatsApp Business App. API broadcasts arrive from your verified business name whether or not the customer has you in their contacts.",
  },
  {
    question: "What is the difference between a broadcast and a drip campaign?",
    answer:
      "A broadcast is one template sent to one audience, now or at a scheduled time. A drip campaign is a sequence of stages, each with its own template, delay and send-at time, so the same audience hears from you across days or weeks. You can start and pause a drip at any stage.",
  },
  {
    question: "How much does a WhatsApp broadcast cost?",
    answer:
      "Meta charges per delivered template message, priced by category — marketing, utility or authentication — and by the recipient's country. RateUp's own plans start free. Put your list size and country into the pricing calculator for a number you can budget with.",
  },
  {
    question: "Can I send a broadcast from more than one WhatsApp number?",
    answer:
      "Yes. RateUp supports multiple connected numbers, so a retail chain can broadcast per region and a group can broadcast per brand. Each campaign picks the number it sends from, and reporting stays separate per number.",
  },
];

export const BROADCAST_STATS = [
  {
    value: "98%",
    label: "Open rate on festive broadcast campaigns",
    panel: "bg-ru-blue-50 ring-1 ring-ru-blue-200 ring-inset",
  },
  {
    value: "3.1×",
    label: "Campaign ROI reported by retail customers",
    panel: "bg-ru-green-50 ring-1 ring-ru-green-100 ring-inset",
  },
  {
    value: "5,000",
    label: "Messages per dispatch batch, 250 workers in parallel",
    panel: "bg-ru-amber-50 ring-1 ring-ru-amber-200 ring-inset",
  },
] as const;

/** The four decisions a campaign takes, in the order the tab strip shows them. */
export const CAMPAIGN_TABS = ["AUDIENCE", "TEMPLATES", "SCHEDULING", "REPORTING"] as const;

export type CampaignTab = (typeof CAMPAIGN_TABS)[number];
