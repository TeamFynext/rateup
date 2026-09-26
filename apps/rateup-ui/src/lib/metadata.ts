import { rateupLogoOg, rateupUrl } from "@/utils/constants.ts";

export const BASE_URL = rateupUrl;

/** Structural mirror of TanStack's (unexported) `LdJsonObject`. */
type JsonLdPrimitive = string | number | boolean | null;
export type JsonLdValue = JsonLdPrimitive | JsonLdObject | readonly JsonLdValue[];
export interface JsonLdObject {
  [key: string]: JsonLdValue | undefined;
}

export interface SitemapEntry {
  priority: string;
  changefreq: string;
  /** Fixed date string. Never `new Date()` — a moving lastmod teaches crawlers to ignore it. */
  lastmod?: string;
}

interface PageMetadata {
  title: string;
  description: string;
  /** Only when the social title should differ from `title`. */
  ogTitle?: string;
  ogDescription?: string;
  /** Absolute URL. Defaults to `rateupLogoOg`. */
  ogImage?: string;
  /** Absolute path. Defaults to the registry key, so every page self-canonicalises. */
  canonical?: string;
  noindex?: boolean;
  jsonLd?: JsonLdObject;
  /** `false` = deliberately absent from `/sitemap.xml` (auth pages, or covered by another sitemap). */
  sitemap?: SitemapEntry | false;
}

/**
 * The single registry for marketing metadata. It feeds `buildPageHead` (title, description,
 * canonical, Open Graph, robots, JSON-LD) and `/sitemap.xml`, so a new marketing page is one
 * entry here plus a route — there is no second list to keep in sync.
 *
 * Canonical defaults to the key, so an entry only sets `canonical` to point somewhere else.
 */
const pageMetadata = {
  "/terms-of-service": {
    title: "Terms of Service of RateUp Omnichannel Customer Engagement Platform",
    description:
      "Read RateUp’s Terms of Service for using our WhatsApp Business API & omnichannel customer engagement platform. Learn your rights and compliance guidelines.",
    sitemap: { priority: "0.3", changefreq: "yearly" },
  },
  "/signup": {
    title: "Sign up With RateUp - Create A Free Account on Customer Engagement Platform",
    description:
      "Sign up RateUp. Start free and get access to WhatsApp Business API and Omnichannel Customer Engagement Platform. Get unified inbox, surveys & loyalty tools for free.",
    sitemap: false,
  },
  "/login": {
    title: "Login to RateUp AI Powered Omnichannel Customer Engagement Platform",
    description:
      "Log in to RateUp and manage WhatsApp Business API automation, customer engagement, loyalty programs & chat workflows - all in one smart AI powered platform.",
    sitemap: false,
  },
  "/pricing": {
    title: "RateUp Pricing - WhatsApp Business API and Customer Engagement Platform",
    description:
      "Explore RateUp pricing for WhatsApp Business API, automation, web surveys, and WhatsApp loyalty tools. Find the right plan to scale customer engagement today.",
    sitemap: { priority: "0.9", changefreq: "weekly" },
  },
  "/privacy-policy": {
    title: "Privacy Policy of RateUp Omnichannel Customer Engagement Platform",
    description:
      "Discover how RateUp protects your data. Read our privacy policy for WhatsApp Business API, automation & omnichannel engagement solutions with full transparency.",
    sitemap: { priority: "0.3", changefreq: "yearly" },
  },
  "/login/reset-password": {
    title: "Reset Password of RateUp - Omnichannel Customer Engagement Platform",
    description:
      "Reset your RateUp password securely and regain access to WhatsApp Business API, chat automation, omnichannel customer engagement tools & unified inbox.",
    sitemap: false,
  },
  "/": {
    title: "RateUp #1 AI Powered WhatsApp Marketing Platform",
    description:
      "RateUp is the #1 WhatsApp marketing platform for business - Unified tool for WhatsApp loyalty & WhatsApp Business API. Built with Meta's Official API. Start free.",
    sitemap: { priority: "1.0", changefreq: "weekly" },
  },
  "/book-a-demo": {
    title: "Book a Demo of RateUp AI Powered WhatsApp Marketing Platform",
    description:
      "Book a free RateUp demo. See how WhatsApp Business API, automation, surveys & loyalty come together in one platform - pick a time that suits your team.",
    sitemap: { priority: "0.7", changefreq: "yearly" },
  },
  "/contact-us": {
    title: "Contact RateUp AI Powered WhatsApp Marketing Platform",
    description:
      "Contact RateUp for support, WhatsApp Business API demos, pricing & omnichannel customer engagement solutions. Our team helps you scale communication faster.",
    sitemap: { priority: "0.6", changefreq: "yearly" },
  },
  "/about-us": {
    title: "About RateUp WhatsApp Loyalty & WhatsApp Business API Platform",
    description:
      "Learn about RateUp, the #1 AI-powered WhatsApp Business API & omnichannel customer engagement platform helping businesses turn chats into conversions.",
    sitemap: { priority: "0.6", changefreq: "yearly" },
  },
  "/products/whatsapp-loyalty": {
    title: "WhatsApp Loyalty Program Software | RateUp",
    description:
      "Run a points, VIP tier and referral programme inside WhatsApp — no app for customers to download. QR sign-up, a cashier app and automatic reminders. Start free.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
  "/products/omnichannel-inbox": {
    title: "Omnichannel Marketing Platform for WhatsApp Instagram, Messenger - RateUp",
    description:
      "WhatsApp, Instagram & Messenger chats in one unified inbox. RateUp Omnichannel inbox helps your team stop juggling tabs and reply faster. Start free.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
  "/products/pipeline": {
    title: "WhatsApp CRM Pipeline for Leads & Support | RateUp",
    description:
      "Turn WhatsApp, Instagram and Messenger chats into leads on a drag-and-drop pipeline. Owners, next steps, stale-lead alerts, insights and a win forecast. Start free.",
    ogTitle: "WhatsApp CRM Pipeline for Leads & Support",
    ogDescription:
      "Every enquiry becomes a lead with an owner, a next step and a stage — set right from the inbox.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
  "/products/meta-ai-agent": {
    title: "Meta AI Agent for WhatsApp Business | RateUp",
    description:
      "Run Meta's AI agent on your WhatsApp number from RateUp. Teach it your FAQs, documents and website, connect your APIs, and hand over to your team in one inbox.",
    ogTitle: "Meta AI Agent for WhatsApp Business",
    ogDescription:
      "Meta's AI agent answers on your WhatsApp number and hands over to your team in the RateUp inbox.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
  "/products/whatsapp-feedback": {
    title: "WhatsApp Customer Feedback After Every Visit | RateUp",
    description:
      "Ask every customer for feedback on WhatsApp after their visit, as a form inside the chat. Happy customers go on to Google; unhappy ones alert your team. Start free.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
  // Targets "WhatsApp survey / NPS survey" only. /products/whatsapp-feedback owns the
  // "customer feedback on WhatsApp" terms — the two pages used to open on the same H1 and
  // compete for the same query.
  "/products/whatsapp-survey": {
    title: "WhatsApp Survey Tool - Run NPS & CSAT Surveys in Chat | RateUp",
    description:
      "Send NPS, CSAT and custom surveys as native WhatsApp Flows forms. Score-based follow-ups, real-time results and up to 35% response rates. No app for customers to install.",
    ogTitle: "WhatsApp Survey Tool - Run NPS & CSAT Surveys in Chat",
    ogDescription:
      "NPS and CSAT surveys that render as a real form inside WhatsApp, with score-based follow-ups and live results.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
  "/products/testimonial-gateway": {
    title: "Customer Testimonial Collection Software - RateUp",
    description:
      "Collect, manage and showcase authentic customer testimonials with RateUp. Build trust, convert more visitors and grow faster - no code required.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
  "/products/ai-review": {
    title: "AI Google Review Generation & Reputation Management - RateUp",
    description:
      "Turn happy customers into 5-star Google reviews with RateUp AI. Filter feedback intelligently, improve local SEO and manage your reputation in one place.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
  "/products/ai-automation": {
    title: "WhatsApp & Instagram Chat Flows and Automation - RateUp",
    description:
      "Automate customer journeys with no-code chat flows and inbox automation rules for WhatsApp and Instagram — greet, tag, route and follow up without lifting a finger.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
  // Deliberately targets "shared team inbox / collaboration" so it does not compete with
  // /products/omnichannel-inbox, which targets the "omnichannel / multi-channel" terms.
  "/products/inbox": {
    title: "Shared Team Inbox for Customer Conversations - RateUp",
    description:
      "Go from conversation to resolution in minutes. RateUp's shared team inbox brings customer chats, assignments and replies together so your team replies faster.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
  // Targets "digital suggestion box / feedback register" - the QR feedback use case.
  // /products/qr-studio covers the QR marketing-and-packaging terms instead.
  "/products/qr": {
    title: "Digital Suggestion Box & QR Feedback System - RateUp",
    description:
      "Replace the paper feedback register with a QR-powered digital suggestion box. Collect customer suggestions instantly and turn them into growth insights.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
  "/products/qr-studio": {
    title: "Smart QR Code Marketing & Packaging Platform - RateUp",
    description:
      "Transform marketing and packaging with RateUp's smart QR codes. Capture leads, drive sales, collect feedback and unlock insights from a single scan.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
  "/blog": {
    title: "Read Blogs on Customer Engagement, WhatsApp Automation and Marketing",
    description:
      "Read the RateUp blog for insights on WhatsApp Business API, customer engagement tools, automation, NPS surveys, loyalty & omnichannel marketing strategies.",
    sitemap: false,
  },
  // ── Tools (public, no signup) ───────────────────────────────────────────────
  // Titles are keyword-first: the tool's search term leads, the brand trails.
  // These are submitted by /tools/sitemap.xml, hence `sitemap: false` here.
  "/tools": {
    title: "WhatsApp & Customer Engagement Tools | RateUp",
    description:
      "Tools for WhatsApp business messaging: link generator, QR code generator, API pricing calculator, COD RTO loss calculator and NPS survey templates. No signup required.",
    ogDescription:
      "Calculators and generators for WhatsApp business messaging, built by RateUp. No signup, runs in your browser.",
    sitemap: false,
  },
  "/tools/whatsapp-link-generator": {
    title: "WhatsApp Link Generator - Create wa.me Chat Links | RateUp",
    description:
      "Generate a WhatsApp click-to-chat link with a prefilled message. Enter your number, copy your wa.me link, and use it in your bio, website, ads or QR codes. No signup.",
    ogTitle: "WhatsApp Link Generator - Create wa.me Chat Links",
    ogDescription:
      "Create a wa.me click-to-chat link with a prefilled message in seconds. No signup, works on mobile and desktop.",
    sitemap: false,
  },
  "/tools/whatsapp-qr-code-generator": {
    title: "WhatsApp QR Code Generator - Download PNG & SVG | RateUp",
    description:
      "Create a WhatsApp QR code for packaging, receipts, standees and shopfronts. High error correction, custom colours, print-ready PNG and vector SVG download. No signup.",
    ogTitle: "WhatsApp QR Code Generator - Download PNG & SVG",
    ogDescription:
      "Turn your WhatsApp number into a scannable, print-ready QR code. No watermark, no signup.",
    sitemap: false,
  },
  "/tools/whatsapp-pricing-calculator": {
    title: "WhatsApp Business API Pricing Calculator - Meta Rates by Country | RateUp",
    description:
      "Calculate your monthly WhatsApp Business API cost from Meta's per-message rates. Compare marketing, utility and authentication pricing across countries, in USD and INR.",
    ogTitle: "WhatsApp Business API Pricing Calculator - Meta Rates by Country",
    ogDescription:
      "Estimate what Meta will charge you per month for WhatsApp template messages, by category and country.",
    sitemap: false,
  },
  "/tools/rto-loss-calculator": {
    title: "COD RTO Loss Calculator for Indian D2C Brands | RateUp",
    description:
      "Find out what cash-on-delivery RTO actually costs you every month — shipping both ways, packaging and blocked working capital — and what reducing it by a few points is worth.",
    ogTitle: "COD RTO Loss Calculator for Indian D2C Brands",
    ogDescription:
      "Put a rupee figure on your return-to-origin losses, and see what WhatsApp COD confirmation could recover.",
    sitemap: false,
  },
  "/tools/nps-survey-templates": {
    title: "NPS Survey Templates by Industry + NPS Calculator | RateUp",
    description:
      "16 ready-to-send NPS survey templates for ecommerce, restaurants, clinics, salons, SaaS and more — with score-based follow-ups, send timing and an NPS score calculator.",
    ogTitle: "NPS Survey Templates by Industry + NPS Calculator",
    ogDescription:
      "Industry-specific NPS questions with follow-ups for promoters, passives and detractors. Copy, edit, send.",
    sitemap: false,
  },
  "/tools/shopify-bulk-discount-code-generator": {
    title: "Shopify Bulk Discount Code Generator - Unique CSV Export | RateUp",
    description:
      "Generate up to 5,000 unique, random discount codes for Shopify with custom prefixes. Download as a clean CSV ready for bulk import.",
    ogTitle: "Shopify Bulk Discount Code Generator - Unique CSV Export",
    ogDescription:
      "Generate random, unique discount codes for your Shopify store in bulk and download a CSV ready to import.",
    sitemap: false,
  },
  "/tools/clv-calculator": {
    title: "CLV & CAC Calculator - Customer Lifetime Value | RateUp",
    description:
      "Calculate Customer Lifetime Value (CLV), payback period, and LTV:CAC ratio. Know when to increase acquisition spend and when to focus on retention.",
    ogTitle: "CLV & CAC Calculator - Customer Lifetime Value",
    ogDescription:
      "Calculate your LTV:CAC ratio and find out if you are under-investing or burning money.",
    sitemap: false,
  },
  "/tools/shopify-fee-calculator": {
    title: "Shopify Fee Calculator - Transaction Profit & Costs | RateUp",
    description:
      "Calculate your exact net profit on a single Shopify transaction. Factor in Shopify transaction fees, payment processing costs, COGS, and shipping.",
    ogTitle: "Shopify Fee Calculator - Transaction Profit & Costs",
    ogDescription:
      "Calculate your exact net profit per order including Shopify transaction fees and payment processing costs.",
    sitemap: false,
  },
  "/tools/profit-margin-calculator": {
    title: "Ecommerce Profit Margin & Breakeven ROAS Calculator | RateUp",
    description:
      "Calculate gross margin, net margin, markup percentage, and breakeven ROAS for your D2C ecommerce orders. Factor in COGS, shipping, ad spend, and gateway fees.",
    ogTitle: "Ecommerce Profit Margin & Breakeven ROAS Calculator",
    ogDescription: "Calculate gross margin, net margin, markup and breakeven ROAS per order.",
    sitemap: false,
  },
  // ── Partner / reseller ──────────────────────────────────────────────────────
  "/partner-page": {
    title: "Become a RateUp Partner - WhatsApp Business API Reseller Program",
    description:
      "Partner with RateUp to resell WhatsApp Business API, loyalty and feedback to your clients. Recurring revenue, white-glove onboarding and a dedicated partner manager.",
    sitemap: { priority: "0.5", changefreq: "yearly" },
  },

  // ── Keyword hub pages ───────────────────────────────────────────────────────
  // Title and description are the design's own `<helmet>` values, not a paraphrase.
  "/products/whatsapp-business-api": {
    title: "WhatsApp Business API for Growing Brands | RateUp",
    description:
      "Get the WhatsApp Business API in minutes with Meta Embedded Signup. Templates, Flows, catalog, payments, loyalty and broadcasts in one platform. Start free.",
    ogTitle: "WhatsApp Business API for Growing Brands",
    ogDescription:
      "Connect through Meta's Embedded Signup and run templates, Flows, catalog, payments, loyalty and broadcasts from one inbox.",
    sitemap: { priority: "0.9", changefreq: "monthly" },
  },
  // Title and description are the design's own `<helmet>` values, not a paraphrase.
  "/products/whatsapp-broadcast": {
    title: "WhatsApp Broadcast Software on the Official API | RateUp",
    description:
      "Send WhatsApp broadcasts to thousands of customers with approved templates, scheduling, daily send limits, automatic retries and delivery reports. Official Business API.",
    ogTitle: "WhatsApp Broadcast Software on the Official API",
    ogDescription:
      "Broadcast to your whole list from a verified number — approved templates, drip stages, retries and a report on every message.",
    sitemap: { priority: "0.9", changefreq: "monthly" },
  },

  // ── Integrations ────────────────────────────────────────────────────────────
  "/integrations": {
    title: "RateUp Integrations - Shopify, WooCommerce, POS, CRM & Zapier",
    description:
      "Connect RateUp to the tools you already run. Two-way sync with Shopify, WooCommerce, Petpooja, Zoho and 3,000+ apps via Zapier, plus a REST API and webhooks.",
    ogTitle: "RateUp Integrations - Shopify, WooCommerce, POS, CRM & Zapier",
    ogDescription:
      "Orders, customers and loyalty points sync both ways. Most setups are live the same day.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
  // Title and description are the design's own `<helmet>` values, not a paraphrase.
  "/integrations/shopify": {
    title: "Shopify WhatsApp Integration: Orders, Loyalty & Feedback | RateUp",
    description:
      "Connect Shopify to WhatsApp in one click. Order updates, abandoned checkout recovery, post-purchase feedback and loyalty points on every paid order. Free plan.",
    ogTitle: "Shopify WhatsApp Integration: Orders, Loyalty & Feedback",
    ogDescription:
      "Store webhooks become WhatsApp messages: order updates, checkout recovery, loyalty points on paid orders and a post-delivery feedback Flow.",
    sitemap: { priority: "0.8", changefreq: "monthly" },
  },
} as const satisfies Record<string, PageMetadata>;

export type PagePath = keyof typeof pageMetadata;

export const SITEMAP_LASTMOD = "2026-09-25";

/** Registry entries that belong in `/sitemap.xml`, in registry order. */
export function sitemapEntries(): { path: PagePath; entry: SitemapEntry }[] {
  return (Object.entries(pageMetadata) as [PagePath, PageMetadata][])
    .filter(([, page]) => page.sitemap !== false && page.sitemap !== undefined && !page.noindex)
    .map(([path, page]) => ({ path, entry: page.sitemap as SitemapEntry }));
}

function absolute(path: string) {
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Head for a registry page. Always emits exactly one canonical — a page that self-canonicalises
 * is the whole point of the registry, and the previous "canonical is optional" shape is what left
 * the homepage without one.
 *
 * `extra.jsonLd` is merged with the registry's own `jsonLd` and serialised into head `scripts`,
 * so routes stop hand-rolling their own `<script type="application/ld+json">` entry. (The
 * `script:ld+json` meta descriptor the router supports at runtime is not in this version's
 * `head.meta` types, which resolve to React's `MetaHTMLAttributes`.)
 */
export function buildPageHead(path: PagePath, extra?: { jsonLd?: JsonLdObject | JsonLdObject[] }) {
  const page: PageMetadata = pageMetadata[path];
  const canonicalUrl = absolute(page.canonical ?? path);
  const ogTitle = page.ogTitle ?? page.title;
  const ogDescription = page.ogDescription ?? page.description;
  const ogImage = page.ogImage ?? rateupLogoOg;

  const graphs = [
    ...(page.jsonLd ? [page.jsonLd] : []),
    ...(extra?.jsonLd ? (Array.isArray(extra.jsonLd) ? extra.jsonLd : [extra.jsonLd]) : []),
  ];

  return {
    meta: [
      { title: page.title },
      { name: "description", content: page.description },
      { name: "robots", content: page.noindex ? "noindex, follow" : "index, follow" },

      { property: "og:type", content: "website" },
      { property: "og:title", content: ogTitle },
      { property: "og:description", content: ogDescription },
      { property: "og:url", content: canonicalUrl },
      { property: "og:image", content: ogImage },

      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: ogTitle },
      { name: "twitter:description", content: ogDescription },
      { name: "twitter:image", content: ogImage },
    ],
    links: [{ rel: "canonical", href: canonicalUrl }],
    scripts: graphs.map((jsonLd) => ({
      type: "application/ld+json",
      children: JSON.stringify(jsonLd),
    })),
  };
}

/**
 * Head for a route that must never be indexed but is not a registry page — OAuth callbacks and
 * the tenant utility URLs behind shared WhatsApp links. These stay crawlable (no robots.txt
 * `Disallow`) so Google can actually see the `noindex`.
 *
 * Defaults to `follow` so link equity still reaches the pages these link to; pass
 * `{ follow: false }` for tenant URLs that should not be crawled onwards at all.
 */
export function noindexHead(canonicalPath?: string, options?: { follow?: boolean }) {
  return {
    meta: [
      {
        name: "robots",
        content: options?.follow === false ? "noindex, nofollow" : "noindex, follow",
      },
    ],
    links: canonicalPath ? [{ rel: "canonical", href: absolute(canonicalPath) }] : [],
  };
}
