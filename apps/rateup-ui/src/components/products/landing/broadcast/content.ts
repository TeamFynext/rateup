/* Copy for the WhatsApp Broadcast landing page. Everything here describes something campaigns
   really do — check `components/dashboard/campaign` and `rateup-api/src/modules/campaign`
   before adding a claim. There is no click tracking, A/B testing or recurring send. */

import type { ProductFaqItem } from "../shared/ProductFaq";

export const BROADCAST_DESCRIPTION =
  "WhatsApp broadcast software on Meta's official WhatsApp Business API: audiences from contacts, groups and past campaigns, approved templates personalised per contact, scheduling in any timezone with daily send limits and drip stages, automatic retries, and a per-campaign delivery funnel with failure reasons.";

/** Feeds the JSON-LD `featureList` and the Markdown twin. */
export const BROADCAST_FEATURES = [
  "Broadcasts from your own verified number on the official WhatsApp Business API",
  "Audiences from contacts, contact groups, CSV import and past campaigns by outcome",
  "Opt-in only sending",
  "Approved templates with per-contact variables from name or custom fields",
  "Image, video and document headers, carousels, and URL, copy-code, quick-reply, catalog and WhatsApp Flow buttons",
  "Send now or schedule in any timezone, with daily send limits",
  "Drip campaigns with stages delayed by minutes, hours or days",
  "Automatic retries for messages Meta holds back, with quiet hours",
  "Auto-pause when the allowance runs out or Meta rejects payment, with resume options",
  "Delivery funnel, failure reasons and what each retry recovered",
  "Resend to chosen recipients, and Excel or ODS delivery reports",
  "Allowance check before sending",
] as const;

export const BROADCAST_FAQS: readonly ProductFaqItem[] = [
  {
    question: "How many people can I broadcast to on WhatsApp?",
    answer:
      "On the WhatsApp Business App a broadcast list stops at 256 contacts, and only people who saved your number receive it. On the official Business API through RateUp there's no recipient cap from us — you send to your whole list. Meta's messaging limits for your number and your plan's conversation allowance are the limits that apply.",
  },
  {
    question: "Will my number get banned for broadcasting?",
    answer:
      "Not for broadcasting on the official API with approved templates from your own verified number. Bans happen to unofficial bulk senders and modded apps, which break Meta's terms outright. Send to people who opted in, send templates they expect, and your quality rating stays healthy.",
  },
  {
    question: "Do customers need to save my number?",
    answer:
      "No. That requirement belongs to broadcast lists in the WhatsApp Business App. API broadcasts arrive from your verified business name whether or not the customer has you in their contacts.",
  },
  {
    question: "What is the difference between a broadcast and a drip campaign?",
    answer:
      "A broadcast is one template sent to one audience, now or at a scheduled time. A drip campaign is a sequence of stages, each with its own template and a delay in minutes, hours or days, so the same audience hears from you over several days.",
  },
  {
    question: "What happens to messages that fail?",
    answer:
      "The report groups failures by Meta's reason and says which ones are worth retrying. When Meta holds a message back because the contact has had too many marketing messages recently, automatic retries send it again once the cap lifts — smart timing or once a day, up to three attempts, never in your quiet hours. For anything else, pick recipients by status and resend yourself.",
  },
  {
    question: "Is there a per-message cost?",
    answer:
      "Meta charges for template messages, priced by category — marketing, utility or authentication — and by the recipient's country. Separately, each RateUp plan includes a conversation allowance, and RateUp checks a campaign against it before you send. The pricing calculator gives you Meta's rates for your country.",
  },
  {
    question: "Can I send from more than one WhatsApp number?",
    answer:
      "Yes. Connect several numbers — per region, per brand — and each campaign picks the number it sends from.",
  },
];

export const PROBLEMS = [
  {
    title: "256 contacts, and only if they saved you",
    body: "Business App broadcast lists stop at 256, and anyone who hasn't saved your number silently never gets the message.",
    icon: "list",
  },
  {
    title: "Bulk senders get numbers banned",
    body: "A modded client or a grey-market panel breaks Meta's terms. When the ban lands, the number and its chat history are gone.",
    icon: "ban",
  },
  {
    title: "No report, no schedule, no team",
    body: "You can't see what was delivered, can't queue a festive send for 9 AM, and can't let two marketers work the same list.",
    icon: "report",
  },
] as const;

/* The illustrative campaign the showcase plays: plain counts, no rates. */
export const FUNNEL_STAGES = ["Attempted", "Delivered", "Read", "Replied"] as const;
