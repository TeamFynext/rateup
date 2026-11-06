/* Copy for the WhatsApp Loyalty landing page. Everything here describes something the loyalty
   programme really does — check `components/dashboard/loyalty`, `rateup-api/src/modules/loyalty`
   and `rateup-app/src/components/loyalty` before adding a claim. Loyalty messages go out on
   WhatsApp only. */

import type { ProductFaqItem } from "../shared/ProductFaq";

export const LOYALTY_DESCRIPTION =
  "RateUp runs a points, VIP tier and referral programme inside WhatsApp. Customers join by scanning a QR code at the counter, collect points on every purchase, check their balance by texting a keyword, and get birthday, win-back and expiry reminders automatically — with no app to download.";

/** Feeds the JSON-LD `featureList` and the Markdown twin. */
export const LOYALTY_FEATURES = [
  "Points on spend, with multipliers, bonus points and tier-only rules",
  "Up to three VIP tiers based on spend, over a rolling window or lifetime",
  "Rewards bought with points, coupons and gifts, with stock and tier limits",
  "Referral codes and links with a bonus for both sides",
  "Join by QR code, keyword, web sign-up or at the counter",
  "QR member card sent on WhatsApp",
  "Keyword replies: JOIN, POINTS, REWARDS, REFER, CARD, STOP",
  "Birthday, anniversary, win-back, VIP-at-risk and expiry reminders",
  "Web cashier, and a staff app that scans member cards and works offline",
  "Overview of members, points issued and redeemed, points liability and repeat visits",
  "Shopify, WooCommerce and REST API for POS systems",
] as const;

export const LOYALTY_FAQS: readonly ProductFaqItem[] = [
  {
    question: "Do customers need to download an app?",
    answer:
      "No. The whole programme lives in WhatsApp. Customers join, check their points, see their rewards and get their member card in the chat they already use.",
  },
  {
    question: "How do customers join?",
    answer:
      "The easiest way is the QR poster at your counter: scanning it opens WhatsApp with the join keyword ready to send. They can also sign up on your web registration page, be registered by staff at the cashier, or tap Join on the welcome message a first-time contact receives.",
  },
  {
    question: "Does it run on our own WhatsApp number?",
    answer:
      "Yes. Everything goes out from your own WhatsApp Business number through the official WhatsApp Business API, with your verified business name on every message.",
  },
  {
    question: "How does it work at the counter?",
    answer:
      "Staff use the web cashier or the RateUp app. Look a member up by name or phone — or, in the app, scan the QR card on their phone — enter the bill and the points are added. If the connection drops, the app queues purchases and sends them once it's back online.",
  },
  {
    question: "How do VIP tiers work?",
    answer:
      "You can set up to three tiers based on how much a member spends, each with its own points multiplier and perks. Count spend over a rolling window of up to twelve months, so members move up and down, or over their lifetime so nobody is ever moved down.",
  },
  {
    question: "Do points expire?",
    answer:
      "Only if you want them to. Switch on expiry after a number of months, and RateUp reminds members before their points expire.",
  },
  {
    question: "Does it connect to our store or POS?",
    answer:
      "Shopify orders award points on payment and reverse them on cancellation, and rewards sync to Shopify as discount codes. WooCommerce stores are supported too, and any POS can award points, redeem rewards and look up members through the REST API.",
  },
];

export const PROBLEMS = [
  {
    title: "Stamp cards get lost",
    body: "Paper cards sit in wallets, go through the wash, and tell you nothing about who your regulars are.",
    icon: "card",
  },
  {
    title: "Nobody installs your app",
    body: "Asking customers to download one more app at the till is the fastest way to end a loyalty programme before it starts.",
    icon: "app",
  },
  {
    title: "No way to bring them back",
    body: "You know a regular has gone quiet. You just have no way to reach them with a reason to come back.",
    icon: "quiet",
  },
] as const;

export const SETUP_STEPS = [
  {
    title: "Profile",
    body: "Name the programme and its points, pick your currency, logo and colour.",
  },
  {
    title: "Earning",
    body: "Points per amount spent, plus sign-up and referral bonuses.",
  },
  {
    title: "VIP tiers",
    body: "Up to three spend-based tiers, each with a multiplier and perks.",
  },
  {
    title: "Rewards",
    body: "What points buy: discounts, free items and gifts.",
  },
  {
    title: "Messages",
    body: "Keyword replies and the notifications members receive.",
  },
  {
    title: "Launch",
    body: "Print the QR poster for your counter and switch the programme on.",
  },
] as const;

/* Illustrative figures for the overview mock. Counts only: a retention or revenue uplift here
   would read as a promise. */
export const OVERVIEW_TILES = [
  { value: "2,418", label: "Members" },
  { value: "86,200", label: "Points issued" },
  { value: "31,450", label: "Points redeemed" },
  { value: "54,750", label: "Outstanding points" },
] as const;

export const TIERS = [
  { name: "Member", count: 1742, width: "w-full", tone: "bg-ru-n-400" },
  { name: "Silver", count: 521, width: "w-[30%]", tone: "bg-ru-blue-400" },
  { name: "Gold", count: 155, width: "w-[9%]", tone: "bg-ru-amber-400" },
] as const;

export const TOP_REWARDS = [
  { name: "Free coffee", redeemed: 412 },
  { name: "₹100 off", redeemed: 238 },
  { name: "Birthday dessert", redeemed: 96 },
] as const;
