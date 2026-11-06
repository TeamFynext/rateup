/* Copy for the Meta AI Agent landing page. The agent is Meta's Business AI, hosted by Meta and
   set up from RateUp — check `components/dashboard/metaAgent` and
   `rateup-api/src/modules/metaAgent` before adding a claim. It runs on WhatsApp only. */

import type { ProductFaqItem } from "../shared/ProductFaq";

export const AGENT_DESCRIPTION =
  "Set up and run Meta's AI agent on your WhatsApp Business number from RateUp. Teach it with your business details, FAQs, documents and website, give it skills and your own APIs, test it, and choose who it answers — with a clean handover to your team in the RateUp inbox.";

/** Feeds the JSON-LD `featureList` and the Markdown twin. */
export const AGENT_FEATURES = [
  "Meta's Business AI agent on your own WhatsApp Business number",
  "Guided setup: eligibility check, knowledge, skills, rich replies, connectors, test, go live",
  "Knowledge from business details, FAQs, files (PDF, Word, Excel, CSV, images) and website pages",
  "Skills written as plain-language instructions",
  "Rich replies: carousels, buttons, WhatsApp Flows, lists, images and location",
  "Connectors to your own HTTPS APIs, plus a built-in RateUp connector for loyalty, labels, lead stage and team assignment",
  "Test chat and Meta-run evaluations",
  "Allowlist of test numbers, never-say phrases, follow-up messages and usage caps",
  "Handover to your team in the RateUp inbox, and hand-back when a ticket closes",
  "Insights: conversations handled, handoffs waiting, tool and event performance",
] as const;

export const AGENT_FAQS: readonly ProductFaqItem[] = [
  {
    question: "Is this RateUp's AI or Meta's?",
    answer:
      "It's Meta's. The agent is Meta's Business AI for WhatsApp, and it runs on Meta's side. RateUp is where you set it up and run it: the knowledge, skills and settings you save in RateUp are sent to Meta, and its conversations land in the same RateUp inbox as your team's.",
  },
  {
    question: "Which channels does it answer on?",
    answer:
      "WhatsApp. The agent is set up per WhatsApp Business number connected to RateUp. Instagram and Messenger conversations stay with your team in the inbox.",
  },
  {
    question: "Is my number eligible?",
    answer:
      "Meta decides. The setup guide starts with an eligibility check, which depends on your business category and country and on accepting Meta's Business Agent terms in WhatsApp Manager. If a number isn't eligible yet, RateUp explains what decides it, and you can check again once that's sorted.",
  },
  {
    question: "What happens when a customer asks for a person?",
    answer:
      "The agent sends a handoff message — Meta's default, one it writes, or your own — and releases the conversation to your team. The inbox shows who is answering, staff can hand a conversation back to the agent at any time, and closing the ticket can hand it back automatically.",
  },
  {
    question: "Can it look up orders or book appointments?",
    answer:
      "Through connectors. Connect your own HTTPS API — for order status, stock or bookings — and describe the job as a skill. RateUp's built-in connector adds loyalty balances and rewards, labels, lead stages and team assignment with one click, acting only on the customer in the conversation.",
  },
  {
    question: "How do I stop it saying the wrong thing?",
    answer:
      "Test it first: chat with it yourself, and run evaluations where Meta simulates conversations from your scenarios and scores the answers. Then pilot on an allowlist of up to 20 numbers, add up to 50 phrases it must never say, and set usage caps so busy days go to your team.",
  },
  {
    question: "What does it cost?",
    answer:
      "Answering every customer needs a payment method on your Meta Business Agent account, and Meta bills for the agent directly. A pilot on the allowlist doesn't. Replies also count against your RateUp plan's AI allowance — see pricing for what each plan includes.",
  },
];

export const PROBLEMS = [
  {
    title: "The same ten questions",
    body: "Opening hours, delivery times, return policy, “is this in stock?” — answered by hand, all day, by someone who has better things to do.",
    icon: "repeat",
  },
  {
    title: "Nobody on at 11 PM",
    body: "The message arrives after closing. By the time the team replies in the morning, the customer has bought somewhere else.",
    icon: "night",
  },
  {
    title: "Bots that trap people",
    body: "A menu that loops, no way to reach a human, and a customer who leaves angrier than they arrived.",
    icon: "trap",
  },
] as const;

export const SETUP_STEPS = [
  {
    title: "Connect",
    body: "Check the number's eligibility with Meta and create the agent.",
  },
  {
    title: "Teach",
    body: "Add business details, FAQs, documents and website pages, then write skills.",
  },
  {
    title: "Go further",
    body: "Optional: rich replies, and connectors to live data from your own systems.",
  },
  {
    title: "Test",
    body: "Chat with it before customers do, and run evaluations on your scenarios.",
  },
  {
    title: "Go live",
    body: "Choose who it answers and how it hands over, then switch it on.",
  },
] as const;

/* Illustrative figures for the insights mock. Counts only — a resolution rate here would read
   as a promise. */
export const INSIGHT_TILES = [
  { value: "1,284", label: "Conversations handled" },
  { value: "6", label: "Waiting on your team" },
  { value: "412", label: "Tool calls" },
] as const;

export const TOOLS = [
  { name: "get_loyalty_status", calls: 186 },
  { name: "list_loyalty_rewards", calls: 97 },
  { name: "set_lead_stage", calls: 71 },
  { name: "order_status (your API)", calls: 58 },
] as const;
