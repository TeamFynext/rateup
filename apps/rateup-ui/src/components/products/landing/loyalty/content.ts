/**
 * Copy and data for the `/products/whatsapp-loyalty` landing page.
 *
 * The FAQ array is the reason this sits apart from the markup: the route builds the page's
 * `FAQPage` JSON-LD from the same six questions the accordion renders.
 *
 * Testimonials and headline figures are the ones the page already published — the design marks
 * them "placeholder", but that refers to its own grey wordmarks, not the copy, which matches what
 * was live. Nothing here is invented.
 */

export interface LoyaltyFaq {
  question: string;
  answer: string;
}

export const LOYALTY_FAQS: readonly LoyaltyFaq[] = [
  {
    question: "Do customers need to download an app?",
    answer:
      "No — that is the whole point. Enrolment, points, tiers, rewards and redemption all happen inside WhatsApp. There is nothing for your customers to install, sign up for, or remember.",
  },
  {
    question: "Do I need the WhatsApp Business API?",
    answer:
      "Yes, and we provision it for you during onboarding. You keep your own number, your own display name and your own quality rating — RateUp is an official Meta Business Partner.",
  },
  {
    question: "How quickly can we launch?",
    answer:
      "Most businesses are live in under an afternoon. Connect your WhatsApp Business account, define points and rewards, sync your store, and you are running — no developers required.",
  },
  {
    question: "How do we track points and rewards?",
    answer:
      "Everything sits in your RateUp dashboard: real-time customer profiles, points balances, tier status, referral activity and engagement history — one record per phone number.",
  },
  {
    question: "What if we already run a loyalty program?",
    answer:
      "You can migrate existing members and balances into RateUp, or run both in parallel. Integrations with Shopify, WooCommerce, POS and CRM keep customer and order data in sync automatically.",
  },
  {
    question: "What does it cost?",
    answer:
      "A flat $31/month covers every feature and unlimited agent seats. Meta's own per-conversation charges are billed through at cost, with no markup.",
  },
];

export const LOYALTY_STEPS = [
  {
    n: "01",
    title: "Connect WhatsApp",
    body: "We provision the Business API on your own number, display name and quality rating.",
    tone: "accent",
  },
  {
    n: "02",
    title: "Set your rewards",
    body: "Points per order or per rupee, tiers, expiry rules and the referral bonus — all in one screen.",
    tone: "warm",
  },
  {
    n: "03",
    title: "Sync your store",
    body: "Orders flow in from Shopify, WooCommerce or your POS. Every buyer becomes a member automatically.",
    tone: "accent",
  },
  {
    n: "04",
    title: "Let it run",
    body: "Points land in the thread, rewards get redeemed, and the second order arrives at no ad cost.",
    tone: "accent",
  },
] as const;

export const LOYALTY_TABS = [
  "profiles",
  "segments",
  "campaigns",
  "referrals",
  "analytics",
] as const;

export type LoyaltyTab = (typeof LOYALTY_TABS)[number];

export const TAB_COPY: Record<
  LoyaltyTab,
  { heading: string; body: string; pills: readonly string[] }
> = {
  profiles: {
    heading: "Real-time customer profiles",
    body: "One record per phone number, updated the moment something happens. Conversation history, order activity, loyalty balance, tier and a churn score that tells you who's slipping away.",
    pills: ["Order timeline", "Points & tier", "Churn score", "Referral tree"],
  },
  segments: {
    heading: "Smart customer segments",
    body: "Group customers by spend, tier, city and activity automatically — then send the right reward to the right audience without ever building a list by hand.",
    pills: ["Behavioural", "Auto-updating", "Tier-based", "Location"],
  },
  campaigns: {
    heading: "Campaigns that get opened",
    body: "Approved WhatsApp templates, sent to any segment in minutes. Double-point weekends, tier upgrades, win-backs — with delivery and click tracking on every send.",
    pills: ["Personalised", "Scheduled", "92% open rate", "Click tracking"],
  },
  referrals: {
    heading: "Referrals that run themselves",
    body: "Every customer gets a tracked link. Both sides are rewarded in the thread, the leaderboard keeps them competing, and you never reconcile a spreadsheet again.",
    pills: ["Auto-tracked", "Two-sided rewards", "Leaderboard", "Fraud checks"],
  },
  analytics: {
    heading: "Analytics you can act on",
    body: "Points issued, redemption rate, retention lift and revenue impact — by product, branch and agent. Sentiment you can act on the same day, not next quarter.",
    pills: ["Real-time", "Redemption rate", "Retention lift", "Revenue impact"],
  },
};

/** Mock data for the panel's screens. Colours are `ru-*` ramp values used as data, not classes. */
export const REFERRALS = [
  { name: "Rohan Kumar", points: "680", colour: "#1C518E" },
  { name: "Liam Miller", points: "240", colour: "#177F45" },
  { name: "Olivia Evans", points: "300", colour: "#5A8CC6" },
  { name: "Beckett Hayes", points: "880", colour: "#2E68A8" },
  { name: "Aria Mathew", points: "420", colour: "#164070" },
] as const;

export const SEGMENTS = [
  {
    name: "VIP champions",
    desc: "Top 5% by lifetime spend",
    colour: "#1C518E",
    count: "1,240",
    pct: 92,
  },
  {
    name: "Loyal regulars",
    desc: "Purchased 3+ times",
    colour: "#177F45",
    count: "3,580",
    pct: 74,
  },
  {
    name: "New members",
    desc: "Joined in last 30 days",
    colour: "#F8951D",
    count: "2,110",
    pct: 58,
  },
  { name: "At risk", desc: "No activity in 60 days", colour: "#C4342C", count: "640", pct: 34 },
  { name: "Win-back", desc: "Lapsed, high past value", colour: "#5A8CC6", count: "430", pct: 22 },
] as const;

export const LEADERS = [
  { name: "Beckett Hayes", referred: 18, points: "8,800", colour: "#1C518E" },
  { name: "Olivia Evans", referred: 14, points: "6,400", colour: "#5A8CC6" },
  { name: "Aria Mathew", referred: 11, points: "5,100", colour: "#177F45" },
  { name: "Noah Bennett", referred: 9, points: "4,200", colour: "#2E68A8" },
  { name: "Rohan Kumar", referred: 7, points: "3,300", colour: "#164070" },
] as const;

export const WEEK_BARS = [
  ["Mon", 48],
  ["Tue", 66],
  ["Wed", 54],
  ["Thu", 82],
  ["Fri", 100],
  ["Sat", 90],
  ["Sun", 72],
] as const;

/** The quotes already published on this page, in the design's card layout. */
export const TESTIMONIALS = [
  {
    badge: "+47% repeat purchases",
    quote:
      "We moved our whole post-purchase flow to WhatsApp and repeat orders went up in the first month. Support stopped drowning.",
    name: "Sanjith",
    role: "Head of IT · Bhima Jewellery",
    colour: "#1C518E",
  },
  {
    badge: "10-minute setup",
    quote:
      "The loyalty program took an afternoon to set up. Customers just reply to a message — no app, no card, no login.",
    name: "Akhil",
    role: "Marketing Manager · myG",
    colour: "#177F45",
  },
  {
    badge: "3× engagement",
    quote:
      "Engagement tripled overnight. Customers open every message and redeem the same day — something email never did for us.",
    name: "Priya Nair",
    role: "Founder · Bloom Beauty",
    colour: "#5A8CC6",
  },
  {
    badge: "+62% referrals",
    quote:
      "The referral program runs itself. Loyal customers bring in new ones and both sides get rewarded automatically.",
    name: "David Park",
    role: "Head of Growth · Kettle&Co",
    colour: "#164070",
  },
] as const;

export const LOYALTY_STATS = [
  { value: "2,500+", label: "Loyalty campaigns automated" },
  { value: "1.2M+", label: "Rewards delivered" },
  { value: "45%", label: "Higher customer retention", warm: true },
  { value: "92%", label: "Message open rate" },
] as const;

export const initials = (name: string) =>
  name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2);
