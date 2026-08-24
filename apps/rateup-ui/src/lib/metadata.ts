interface PageMetadata {
  title: string;
  description: string;
  openGraph?: {
    title?: string;
    description?: string;
  };
  alternates?: {
    canonical?: string;
  };
  robots?: {
    index?: boolean;
    follow?: boolean;
  };
}

const pageMetadata: Record<string, PageMetadata> = {
  "/terms-of-service": {
    title: "Terms of Service of RateUp Omnichannel Customer Engagement Platform",
    description:
      "Read RateUp’s Terms of Service for using our WhatsApp Business API & omnichannel customer engagement platform. Learn your rights and compliance guidelines.",
    openGraph: {
      title: "Terms of Service of RateUp Omnichannel Customer Engagement Platform",
      description:
        "Read RateUp’s Terms of Service for using our WhatsApp Business API & omnichannel customer engagement platform. Learn your rights and compliance guidelines.",
    },
    alternates: {
      canonical: "/terms-of-service",
    },
  },
  "/signup": {
    title: "Sign up With RateUp - Create A Free Account on Customer Engagement Platform",
    description:
      "Sign up RateUp. Start free and get access to WhatsApp Business API and Omnichannel Customer Engagement Platform. Get unified inbox, surveys & loyalty tools for free.",
    openGraph: {
      title: "Sign up With RateUp - Create A Free Account on Customer Engagement Platform",
      description:
        "Sign up RateUp. Start free and get access to WhatsApp Business API and Omnichannel Customer Engagement Platform. Get unified inbox, surveys & loyalty tools for free.",
    },
    alternates: {
      canonical: "/signup",
    },
  },
  "/login": {
    title: "Login to RateUp AI Powered Omnichannel Customer Engagement Platform",
    description:
      "Log in to RateUp and manage WhatsApp Business API automation, customer engagement, loyalty programs & chat workflows - all in one smart AI powered platform.",
    openGraph: {
      title: "Login to RateUp AI Powered Omnichannel Customer Engagement Platform",
      description:
        "Log in to RateUp and manage WhatsApp Business API automation, customer engagement, loyalty programs & chat workflows - all in one smart AI powered platform.",
    },
    alternates: {
      canonical: "/login",
    },
  },
  "/pricing": {
    title: "RateUp Pricing - WhatsApp Business API and Customer Engagement Platform",
    description:
      "Explore RateUp pricing for WhatsApp Business API, automation, web surveys, and WhatsApp loyalty tools. Find the right plan to scale customer engagement today.",
    openGraph: {
      title: "RateUp Pricing - WhatsApp Business API and Customer Engagement Platform",
      description:
        "Explore RateUp pricing for WhatsApp Business API, automation, web surveys, and WhatsApp loyalty tools. Find the right plan to scale customer engagement today.",
    },
    alternates: {
      canonical: "/pricing",
    },
  },
  "/privacy-policy": {
    title: "Privacy Policy of RateUp Omnichannel Customer Engagement Platform",
    description:
      "Discover how RateUp protects your data. Read our privacy policy for WhatsApp Business API, automation & omnichannel engagement solutions with full transparency.",
    openGraph: {
      title: "Privacy Policy of RateUp Omnichannel Customer Engagement Platform",
      description:
        "Discover how RateUp protects your data. Read our privacy policy for WhatsApp Business API, automation & omnichannel engagement solutions with full transparency.",
    },
    alternates: {
      canonical: "/privacy-policy",
    },
  },
  "/login/reset-password": {
    title: "Reset Password of RateUp - Omnichannel Customer Engagement Platform",
    description:
      "Reset your RateUp password securely and regain access to WhatsApp Business API, chat automation, omnichannel customer engagement tools & unified inbox.",
    openGraph: {
      title: "Reset Password of RateUp - Omnichannel Customer Engagement Platform",
      description:
        "Reset your RateUp password securely and regain access to WhatsApp Business API, chat automation, omnichannel customer engagement tools & unified inbox.",
    },
    alternates: {
      canonical: "/login/reset-password",
    },
  },
  "/": {
    title: "RateUp #1 AI Powered WhatsApp Marketing Platform",
    description:
      "RateUp is the #1 WhatsApp marketing platform for business - Unified tool for WhatsApp loyalty & WhatsApp Business API. Built with Meta's Official API. Start free.",
    openGraph: {
      title: "RateUp #1 AI Powered WhatsApp Marketing Platform",
      description:
        "RateUp is the #1 WhatsApp marketing platform for business - Unified tool for WhatsApp loyalty & WhatsApp Business API. Built with Meta's Official API. Start free.",
    },
    alternates: {
      canonical: "",
    },
  },
  "/contact-us": {
    title: "Contact RateUp AI Powered WhatsApp Marketing Platform",
    description:
      "Contact RateUp for support, WhatsApp Business API demos, pricing & omnichannel customer engagement solutions. Our team helps you scale communication faster.",
    openGraph: {
      title: "Contact RateUp AI Powered WhatsApp Marketing Platform",
      description:
        "Contact RateUp for support, WhatsApp Business API demos, pricing & omnichannel customer engagement solutions. Our team helps you scale communication faster.",
    },
    alternates: {
      canonical: "/contact-us",
    },
  },
  "/about-us": {
    title: "About RateUp WhatsApp Loyalty & WhatsApp Business API Platform",
    description:
      "Learn about RateUp, the #1 AI-powered WhatsApp Business API & omnichannel customer engagement platform helping businesses turn chats into conversions.",
    openGraph: {
      title: "About RateUp WhatsApp Loyalty & WhatsApp Business API Platform",
      description:
        "Learn about RateUp, the #1 AI-powered WhatsApp Business API & omnichannel customer engagement platform helping businesses turn chats into conversions.",
    },
    alternates: {
      canonical: "/about-us",
    },
  },
  "/products/whatsapp-loyalty": {
    title: "Best Whatsapp Loyalty Program Software by RateUp",
    description:
      "RateUp's WhatsApp Loyalty Program rewards customers with points, tiers & referrals - no app required. Start free and increase your customer retention.",
    openGraph: {
      title: "Best Whatsapp Loyalty Program Software by RateUp",
      description:
        "RateUp's WhatsApp Loyalty Program rewards customers with points, tiers & referrals - no app required. Start free and increase your customer retention.",
    },
    alternates: {
      canonical: "/products/whatsapp-loyalty",
    },
  },
  "/products/omnichannel-inbox": {
    title: "Omnichannel Marketing Platform for WhatsApp Instagram, Messenger - RateUp",
    description:
      "WhatsApp, Instagram & Messenger chats in one unified inbox. RateUp Omnichannel inbox helps your team stop juggling tabs and reply faster. Start free.",
    openGraph: {
      title: "Omnichannel Marketing Platform for WhatsApp Instagram, Messenger - RateUp",
      description:
        "WhatsApp, Instagram & Messenger chats in one unified inbox. RateUp Omnichannel inbox helps your team stop juggling tabs and reply faster. Start free.",
    },
    alternates: {
      canonical: "/products/omnichannel-inbox",
    },
  },
  "/products/whatsapp-feedback": {
    title: "WhatsApp Customer Feedback & Survey Automation Tool - RateUp",
    description:
      "Collect customer feedback on WhatsApp - RateUp's WhatsApp Flows meet customers where they already are - boosting feedback by up to 35%. Start free.",
    openGraph: {
      title: "WhatsApp Customer Feedback & Survey Automation Tool - RateUp",
      description:
        "Collect customer feedback on WhatsApp - RateUp's WhatsApp Flows meet customers where they already are - boosting feedback by up to 35%. Start free.",
    },
    alternates: {
      canonical: "/products/whatsapp-feedback",
    },
  },
  "/products/whatsapp-survey": {
    title: "Free Online WhatsApp Web Survey Creator Application by RateUp",
    description:
      "Collect instant customer feedback with RateUp Free Online Web Surveys. Run NPS, CSAT & polls in real time to boost engagement and improve satisfaction.",
    openGraph: {
      title: "Free Online WhatsApp Web Survey Creator Application by RateUp",
      description:
        "Collect instant customer feedback with RateUp Free Online Web Surveys. Run NPS, CSAT & polls in real time to boost engagement and improve satisfaction.",
    },
    alternates: {
      canonical: "/products/whatsapp-survey",
    },
  },
  "/products/ticketing": {
    title: "WhatsApp Ticketing & Customer Support Software - RateUp",
    description:
      "Turn WhatsApp chats into trackable support tickets with RateUp. Assign, prioritise and resolve customer issues from one shared team inbox. Start free.",
    openGraph: {
      title: "WhatsApp Ticketing & Customer Support Software - RateUp",
      description:
        "Turn WhatsApp chats into trackable support tickets with RateUp. Assign, prioritise and resolve customer issues from one shared team inbox. Start free.",
    },
    alternates: {
      canonical: "/products/ticketing",
    },
  },
  "/products/testimonial-gateway": {
    title: "Customer Testimonial Collection Software - RateUp",
    description:
      "Collect, manage and showcase authentic customer testimonials with RateUp. Build trust, convert more visitors and grow faster - no code required.",
    openGraph: {
      title: "Customer Testimonial Collection Software - RateUp",
      description:
        "Collect, manage and showcase authentic customer testimonials with RateUp. Build trust, convert more visitors and grow faster - no code required.",
    },
    alternates: {
      canonical: "/products/testimonial-gateway",
    },
  },
  "/products/ai-review": {
    title: "AI Google Review Generation & Reputation Management - RateUp",
    description:
      "Turn happy customers into 5-star Google reviews with RateUp AI. Filter feedback intelligently, improve local SEO and manage your reputation in one place.",
    openGraph: {
      title: "AI Google Review Generation & Reputation Management - RateUp",
      description:
        "Turn happy customers into 5-star Google reviews with RateUp AI. Filter feedback intelligently, improve local SEO and manage your reputation in one place.",
    },
    alternates: {
      canonical: "/products/ai-review",
    },
  },
  "/products/ai-automation": {
    title: "AI Chat Automation for WhatsApp & Instagram - RateUp",
    description:
      "Automate customer journeys with RateUp AI. Build no-code chat flows for WhatsApp and Instagram that qualify leads, answer FAQs and convert around the clock.",
    openGraph: {
      title: "AI Chat Automation for WhatsApp & Instagram - RateUp",
      description:
        "Automate customer journeys with RateUp AI. Build no-code chat flows for WhatsApp and Instagram that qualify leads, answer FAQs and convert around the clock.",
    },
    alternates: {
      canonical: "/products/ai-automation",
    },
  },
  // Deliberately targets "shared team inbox / collaboration" so it does not compete with
  // /products/omnichannel-inbox, which targets the "omnichannel / multi-channel" terms.
  "/products/inbox": {
    title: "Shared Team Inbox for Customer Conversations - RateUp",
    description:
      "Go from conversation to resolution in minutes. RateUp's shared team inbox brings customer chats, assignments and replies together so your team replies faster.",
    openGraph: {
      title: "Shared Team Inbox for Customer Conversations - RateUp",
      description:
        "Go from conversation to resolution in minutes. RateUp's shared team inbox brings customer chats, assignments and replies together so your team replies faster.",
    },
    alternates: {
      canonical: "/products/inbox",
    },
  },
  // Targets "digital suggestion box / feedback register" - the QR feedback use case.
  // /products/qr-studio covers the QR marketing-and-packaging terms instead.
  "/products/qr": {
    title: "Digital Suggestion Box & QR Feedback System - RateUp",
    description:
      "Replace the paper feedback register with a QR-powered digital suggestion box. Collect customer suggestions instantly and turn them into growth insights.",
    openGraph: {
      title: "Digital Suggestion Box & QR Feedback System - RateUp",
      description:
        "Replace the paper feedback register with a QR-powered digital suggestion box. Collect customer suggestions instantly and turn them into growth insights.",
    },
    alternates: {
      canonical: "/products/qr",
    },
  },
  "/products/qr-studio": {
    title: "Smart QR Code Marketing & Packaging Platform - RateUp",
    description:
      "Transform marketing and packaging with RateUp's smart QR codes. Capture leads, drive sales, collect feedback and unlock insights from a single scan.",
    openGraph: {
      title: "Smart QR Code Marketing & Packaging Platform - RateUp",
      description:
        "Transform marketing and packaging with RateUp's smart QR codes. Capture leads, drive sales, collect feedback and unlock insights from a single scan.",
    },
    alternates: {
      canonical: "/products/qr-studio",
    },
  },
  "/blog": {
    title: "Read Blogs on Customer Engagement, WhatsApp Automation and Marketing",
    description:
      "Read the RateUp blog for insights on WhatsApp Business API, customer engagement tools, automation, NPS surveys, loyalty & omnichannel marketing strategies.",
    openGraph: {
      title: "Read Blogs on Customer Engagement, WhatsApp Automation and Marketing",
      description:
        "Read the RateUp blog for insights on WhatsApp Business API, customer engagement tools, automation, NPS surveys, loyalty & omnichannel marketing strategies.",
    },
    alternates: {
      canonical: "/blog",
    },
  },
  "/blog/tag": {
    title: "Read Blogs on Customer Engagement, WhatsApp Automation and Marketing",
    description:
      "Read the RateUp blog for insights on WhatsApp Business API, customer engagement tools, automation, NPS surveys, loyalty & omnichannel marketing strategies.",
    openGraph: {
      title: "Read Blogs on Customer Engagement, WhatsApp Automation and Marketing",
      description:
        "Read the RateUp blog for insights on WhatsApp Business API, customer engagement tools, automation, NPS surveys, loyalty & omnichannel marketing strategies.",
    },
    alternates: {
      canonical: "/blog",
    },
    robots: {
      index: false,
      follow: true,
    },
  },

  // ── Tools (public, no signup) ────────────────────────────────────────────────
  // Titles are keyword-first: the tool's search term leads, the brand trails.
  "/tools": {
    title: "WhatsApp & Customer Engagement Tools | RateUp",
    description:
      "Tools for WhatsApp business messaging: link generator, QR code generator, API pricing calculator, COD RTO loss calculator and NPS survey templates. No signup required.",
    openGraph: {
      title: "WhatsApp & Customer Engagement Tools | RateUp",
      description:
        "Calculators and generators for WhatsApp business messaging, built by RateUp. No signup, runs in your browser.",
    },
    alternates: {
      canonical: "/tools",
    },
  },
  "/tools/whatsapp-link-generator": {
    title: "WhatsApp Link Generator - Create wa.me Chat Links | RateUp",
    description:
      "Generate a WhatsApp click-to-chat link with a prefilled message. Enter your number, copy your wa.me link, and use it in your bio, website, ads or QR codes. No signup.",
    openGraph: {
      title: "WhatsApp Link Generator - Create wa.me Chat Links",
      description:
        "Create a wa.me click-to-chat link with a prefilled message in seconds. No signup, works on mobile and desktop.",
    },
    alternates: {
      canonical: "/tools/whatsapp-link-generator",
    },
  },
  "/tools/whatsapp-qr-code-generator": {
    title: "WhatsApp QR Code Generator - Download PNG & SVG | RateUp",
    description:
      "Create a WhatsApp QR code for packaging, receipts, standees and shopfronts. High error correction, custom colours, print-ready PNG and vector SVG download. No signup.",
    openGraph: {
      title: "WhatsApp QR Code Generator - Download PNG & SVG",
      description:
        "Turn your WhatsApp number into a scannable, print-ready QR code. No watermark, no signup.",
    },
    alternates: {
      canonical: "/tools/whatsapp-qr-code-generator",
    },
  },
  "/tools/whatsapp-pricing-calculator": {
    title: "WhatsApp Business API Pricing Calculator - Meta Rates by Country | RateUp",
    description:
      "Calculate your monthly WhatsApp Business API cost from Meta's per-message rates. Compare marketing, utility and authentication pricing across countries, in USD and INR.",
    openGraph: {
      title: "WhatsApp Business API Pricing Calculator - Meta Rates by Country",
      description:
        "Estimate what Meta will charge you per month for WhatsApp template messages, by category and country.",
    },
    alternates: {
      canonical: "/tools/whatsapp-pricing-calculator",
    },
  },
  "/tools/rto-loss-calculator": {
    title: "COD RTO Loss Calculator for Indian D2C Brands | RateUp",
    description:
      "Find out what cash-on-delivery RTO actually costs you every month — shipping both ways, packaging and blocked working capital — and what reducing it by a few points is worth.",
    openGraph: {
      title: "COD RTO Loss Calculator for Indian D2C Brands",
      description:
        "Put a rupee figure on your return-to-origin losses, and see what WhatsApp COD confirmation could recover.",
    },
    alternates: {
      canonical: "/tools/rto-loss-calculator",
    },
  },
  "/tools/nps-survey-templates": {
    title: "NPS Survey Templates by Industry + NPS Calculator | RateUp",
    description:
      "16 ready-to-send NPS survey templates for ecommerce, restaurants, clinics, salons, SaaS and more — with score-based follow-ups, send timing and an NPS score calculator.",
    openGraph: {
      title: "NPS Survey Templates by Industry + NPS Calculator",
      description:
        "Industry-specific NPS questions with follow-ups for promoters, passives and detractors. Copy, edit, send.",
    },
    alternates: {
      canonical: "/tools/nps-survey-templates",
    },
  },
};

const BASE_URL = "https://rateup.app";

export function buildPageHead(path: string) {
  const page = pageMetadata[path];
  if (!page) return {};

  const canonicalPath = page.alternates?.canonical;
  let canonicalUrl: string | undefined;
  if (canonicalPath) {
    const normalizedCanonicalPath = canonicalPath.startsWith("/")
      ? canonicalPath
      : `/${canonicalPath}`;
    canonicalUrl = `${BASE_URL}${normalizedCanonicalPath}`;
  }

  return {
    meta: [
      { title: page.title },
      {
        name: "description",
        content: page.description,
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:title",
        content: page.openGraph?.title ?? page.title,
      },
      {
        property: "og:description",
        content: page.openGraph?.description ?? page.description,
      },
      ...(canonicalUrl
        ? [
            {
              property: "og:url",
              content: canonicalUrl,
            },
          ]
        : []),
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: page.openGraph?.title ?? page.title,
      },
      {
        name: "twitter:description",
        content: page.openGraph?.description ?? page.description,
      },
      ...(page.robots
        ? [
            {
              name: "robots",
              content: `${page.robots.index === false ? "noindex" : "index"}, ${page.robots.follow === false ? "nofollow" : "follow"}`,
            },
          ]
        : []),
    ],
    links: canonicalUrl
      ? [
          {
            rel: "canonical",
            href: canonicalUrl,
          },
        ]
      : [],
  };
}
