/* Copy for the WhatsApp Feedback landing page. Everything here describes something the product
   really does — check `components/dashboard/loyalty/feedback`, `rateup-api/src/modules/loyalty/
   feedback` and the survey settings before adding a claim. The review reward is left out on
   purpose: incentivised reviews break Google's policy. */

import type { ProductFaqItem } from "../shared/ProductFaq";

export const FEEDBACK_DESCRIPTION =
  "RateUp asks every customer for feedback on WhatsApp shortly after their visit, as a native WhatsApp Flow form they answer inside the chat. Happy customers are invited to review you on Google; unhappy ones alert your team straight away.";

/** Feeds the JSON-LD `featureList` and the Markdown twin. */
export const FEEDBACK_FEATURES = [
  "Automatic feedback request on WhatsApp after each recorded purchase",
  "Adjustable send delay and a per-customer cooldown",
  "Native WhatsApp Flow form answered inside the chat",
  "Ready-made question sets for restaurants, retail, salons, gyms and any business",
  "Google review invitation for customers above your rating threshold",
  "Unhappy-customer alerts by push, email, desktop and in-app",
  "Results: asked, answered, completion rate, happy share, review link taps, per-question averages",
  "Web surveys with QR codes, kiosk mode, NPS and multiple languages",
  "AI summaries of written answers",
  "Shopify order-event surveys, Zapier, Google Sheets and webhooks",
] as const;

export const FEEDBACK_FAQS: readonly ProductFaqItem[] = [
  {
    question: "When is the feedback request sent?",
    answer:
      "After a purchase is recorded in your RateUp loyalty programme — at the cashier, from Shopify or from your POS through the API. You choose the delay (two hours by default) and a cooldown, so a regular isn't asked after every single visit.",
  },
  {
    question: "What does the customer see?",
    answer:
      "A WhatsApp message with a button that opens a short form right inside the chat — star ratings and an optional comment. There's no link to a website and nothing to install.",
  },
  {
    question: "What happens with a bad rating?",
    answer:
      "Your team gets an “Unhappy customer feedback” alert — in the app, by push, by email and on the desktop — with the customer's name and rating, so someone can reach out while the visit is still fresh.",
  },
  {
    question: "And with a good one?",
    answer:
      "Customers who rate you at or above your threshold get a thank-you with a Review us on Google button that opens your Google review page. RateUp counts the taps, so you can see how many happy customers went on to Google.",
  },
  {
    question: "Can I change the questions?",
    answer:
      "Yes. Start from a question set for your kind of business — restaurant and café, retail store, salon and spa, gym and fitness, or any business — and edit it in the WhatsApp Flow builder.",
  },
  {
    question: "What if a customer hasn't messaged us recently?",
    answer:
      "WhatsApp only allows free-form messages within 24 hours of the customer's last message. Outside that window RateUp sends the request as an approved utility template with the same form button. Meta charges for template messages — the pricing calculator shows the rates for your country.",
  },
  {
    question: "Do we need a separate survey tool?",
    answer:
      "Not for feedback. For longer research — NPS, product surveys, forms at a kiosk or behind a QR code — RateUp's web surveys sit in the same account, with logic jumps, themes, multiple languages and AI summaries of the written answers.",
  },
];

export const PROBLEMS = [
  {
    title: "Surveys nobody opens",
    body: "A link in an email a week after the visit lands in a promotions tab next to forty others. The customer has already forgotten the meal.",
    icon: "mail",
  },
  {
    title: "Paper and tablets at the till",
    body: "A comment card or a kiosk catches the few who stop — and misses everyone in a hurry, which is exactly who you need to hear from.",
    icon: "paper",
  },
  {
    title: "You hear it on Google first",
    body: "The unhappy customer didn't complain to you. They told the internet, and now it's the first thing new customers read.",
    icon: "review",
  },
] as const;

export const STEPS = [
  {
    title: "A purchase is recorded",
    body: "At the cashier, from Shopify or from your POS — the customer's visit lands in your loyalty programme.",
  },
  {
    title: "WhatsApp asks, later",
    body: "Two hours afterwards by default, with a cooldown so regulars aren't asked every time.",
  },
  {
    title: "Answered in the chat",
    body: "A native WhatsApp form: a few star ratings and an optional comment.",
  },
  {
    title: "Routed by the rating",
    body: "Happy customers are invited to Google. Unhappy ones alert your team.",
  },
] as const;

/* Illustrative figures for the results mock. The completion and happy shares are what the
   results tab itself shows; they describe the sample, not a promise. */
export const RESULT_TILES = [
  { value: "1,204", label: "Asked" },
  { value: "538", label: "Answered" },
  { value: "412", label: "Rated above your threshold" },
  { value: "187", label: "Review link taps" },
] as const;

export const QUESTION_AVERAGES = [
  { question: "Overall experience", average: 4.6, width: "w-[92%]" },
  { question: "Food quality", average: 4.7, width: "w-[94%]" },
  { question: "Service", average: 4.2, width: "w-[84%]" },
] as const;
