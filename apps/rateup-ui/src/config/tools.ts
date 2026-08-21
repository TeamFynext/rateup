/**
 * Registry for the no-signup tools served under `/tools`.
 *
 * This is the single source of truth for the tools sidebar, the `/tools` index,
 * the tools sitemap, cross-links between tools and the FAQ JSON-LD on each page.
 * Adding a tool = add an entry here + a route + a component.
 */
import {
  IconBrandWhatsapp,
  IconCalculator,
  IconMessage2Star,
  IconQrcode,
  IconTruckReturn,
  type Icon,
} from "@tabler/icons-react";

export type ToolCategory = "WhatsApp essentials" | "Calculators" | "Feedback & surveys";

export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolStep {
  /** Two-digit ordinal rendered in the warm gradient, e.g. "01". */
  n: string;
  title: string;
  body: string;
}

export interface ToolDefinition {
  /** URL segment under /tools */
  slug: string;
  /** Sidebar / nav label — short. */
  name: string;
  /** On-page H1. */
  headline: string;
  /** One-line subhead under the H1. */
  tagline: string;
  /** Card copy on the /tools index. */
  description: string;
  icon: Icon;
  category: ToolCategory;
  /** Third pill in the hero, after "No signup" and "No email gate". */
  badge: string;
  /** Three-step "How it works" band below the tool. */
  steps: ToolStep[];
  /** Headline for the closing conversion band. */
  cta: string;
  faqs: ToolFaq[];
}

export const TOOLS_BASE_PATH = "/tools";

export const toolPath = (slug: string) => `${TOOLS_BASE_PATH}/${slug}`;

export const TOOLS: ToolDefinition[] = [
  {
    slug: "whatsapp-link-generator",
    name: "WhatsApp Link Generator",
    headline: "WhatsApp Link Generator",
    tagline:
      "Turn any phone number into a click-to-chat wa.me link with a message already typed for your customer.",
    description:
      "Create a wa.me click-to-chat link with a prefilled message. Paste it in your bio, emails, ads or QR codes.",
    icon: IconBrandWhatsapp,
    category: "WhatsApp essentials",
    badge: "Works on mobile",
    cta: "Answer every one of those chats automatically.",
    steps: [
      {
        n: "01",
        title: "Enter your number",
        body: "Pick the country and type the number as you would dial it locally. We normalise it to E.164 and drop the + — wa.me rejects it.",
      },
      {
        n: "02",
        title: "Write the opener",
        body: "Your message is URL-encoded into the link and lands as a draft the customer can send with one tap.",
      },
      {
        n: "03",
        title: "Copy and place it",
        body: "Bio links, email signatures, ad CTAs, QR codes on packaging. One link works everywhere WhatsApp is installed.",
      },
    ],
    faqs: [
      {
        question: "What is a wa.me link?",
        answer:
          "wa.me is WhatsApp's official click-to-chat endpoint. Opening https://wa.me/<number> starts a chat with that number without the visitor having to save it as a contact first. Adding ?text= puts a message in their input box, ready to send.",
      },
      {
        question: "Why does my WhatsApp link not work?",
        answer:
          "Nine times out of ten the number still has a '+', a space, a dash or brackets in it, or the country code is missing. wa.me accepts digits only, in full international format — 919876543210, not +91 98765 43210 and not 9876543210. This generator normalises that for you.",
      },
      {
        question: "Does the WhatsApp link generator cost anything?",
        answer:
          "No. It runs entirely in your browser, there is no signup, no email required and no limit on how many links you create. The link you get never expires and does not route through RateUp.",
      },
      {
        question: "Can I add a prefilled message to a WhatsApp link?",
        answer:
          "Yes — type it in the message box and it is URL-encoded into the link automatically. The customer sees it in their input field and can edit it before sending, so keep it short and specific, like 'Hi, I'd like to know if the blue kurta is in stock.'",
      },
      {
        question: "Does a WhatsApp link work on desktop and mobile?",
        answer:
          "Yes. On mobile it opens the WhatsApp app; on desktop it opens WhatsApp Web or the desktop app. The same link works for both, so you only need one.",
      },
    ],
  },
  {
    slug: "whatsapp-qr-code-generator",
    name: "WhatsApp QR Code Generator",
    headline: "WhatsApp QR Code Generator",
    tagline:
      "Generate a scannable WhatsApp QR code for your packaging, receipts, counter or table tents. Download as PNG or SVG.",
    description:
      "Turn your WhatsApp number into a print-ready QR code. High error correction, custom colour, PNG and SVG download.",
    icon: IconQrcode,
    category: "WhatsApp essentials",
    badge: "Print ready",
    cta: "Turn every scan into an automated conversation.",
    steps: [
      {
        n: "01",
        title: "Set number and message",
        body: "The QR encodes the same wa.me link as our link generator, so the scan opens a chat with your opener pre-filled.",
      },
      {
        n: "02",
        title: "Pick error correction",
        body: "Level H tolerates 30% damage — the right choice if you overprint a logo or the code lives on a surface that scuffs.",
      },
      {
        n: "03",
        title: "Download and print",
        body: "PNG at 1024px for print, SVG for your designer. Never crop the white quiet zone, and never scale below 2 cm.",
      },
    ],
    faqs: [
      {
        question: "How do I make a WhatsApp QR code?",
        answer:
          "Enter your WhatsApp number and, optionally, the message you want the customer to send. The tool builds a wa.me link and encodes it as a QR code you can download as PNG for print or SVG for design files.",
      },
      {
        question: "What size should I print a WhatsApp QR code?",
        answer:
          "A good rule is 1 cm of QR for every 10 cm of scanning distance. For packaging or a receipt, 2–3 cm is comfortable. For a counter standee scanned from a metre away, print at least 10 cm. Always leave the white quiet zone around the edge — cropping it is the most common reason a printed QR fails to scan.",
      },
      {
        question: "Why does this tool use high error correction?",
        answer:
          "Level H error correction lets roughly 30% of the code be damaged, covered or overprinted and still scan. That matters on packaging, where ink smudges, folds and logo overlays are normal.",
      },
      {
        question: "Can I edit the QR code after printing it?",
        answer:
          "No — a QR generated here is static, so the destination is baked into the printed code. If you need to change the number or the message later, or want scan analytics, you need a dynamic QR, which is what RateUp QR Studio does.",
      },
      {
        question: "Does the WhatsApp QR code generator cost anything?",
        answer:
          "No. There is no signup, no watermark and no expiry, and the QR is generated in your browser rather than on a server.",
      },
    ],
  },
  {
    slug: "whatsapp-pricing-calculator",
    name: "WhatsApp API Pricing Calculator",
    headline: "WhatsApp Business API Pricing Calculator",
    tagline:
      "Estimate what Meta will charge you per month for marketing, utility and authentication messages — by country and volume.",
    description:
      "Work out your monthly WhatsApp Business API bill from Meta's per-message rates, in USD and INR.",
    icon: IconCalculator,
    category: "Calculators",
    badge: "2026 rate card",
    cta: "Same Meta rates. No reseller markup.",
    steps: [
      {
        n: "01",
        title: "Pick your market",
        body: "Rates are set by the recipient's country, not your business location. Meta prices some countries individually and folds the rest into regions.",
      },
      {
        n: "02",
        title: "Split by category",
        body: "Marketing costs the most, utility and authentication are a fraction of it, and service messages are never billed.",
      },
      {
        n: "03",
        title: "Add the platform fee",
        body: "Meta's per-message charge is the same whoever you buy through. What differs is the platform on top — and whether it adds a markup.",
      },
    ],
    faqs: [
      {
        question: "How does WhatsApp Business API pricing work?",
        answer:
          "Meta charges per template message delivered, priced by category — marketing, utility and authentication — with rates that differ per country. Service messages (your replies inside a customer-initiated conversation) are free. On top of Meta's rate, your BSP or platform may add its own fee.",
      },
      {
        question: "Which WhatsApp messages are free?",
        answer:
          "Four kinds. Any non-template message (text, image, document and so on) sent inside the 24-hour customer service window a customer opened by messaging you. Utility templates sent inside that same window — a common and often-missed saving. Everything sent inside the 72-hour free-entry-point window that opens when you reply to someone who reached you from a Click-to-WhatsApp ad or a Page call-to-action. And messages customers send you. Only template messages sent outside those windows are billed.",
      },
      {
        question: "Do WhatsApp message rates drop at higher volumes?",
        answer:
          "Yes, on utility and authentication — never on marketing. Meta runs volume tiers per market and category, and each band is charged at its own rate rather than repricing everything at the tier you reach, stepping down to as much as 30% below list at the top. Volume is pooled across every WhatsApp Business account in your business portfolio, only charged messages accrue towards it, and the count resets at the start of each month in your account's timezone.",
      },
      {
        question: "What is the difference between marketing, utility and authentication messages?",
        answer:
          "Marketing is promotional: offers, launches, re-engagement. Utility is transactional and tied to an order or account: order confirmations, delivery updates, payment reminders. Authentication is one-time passcodes. Marketing is the most expensive category almost everywhere; utility and authentication are considerably cheaper.",
      },
      {
        question: "How often does Meta change WhatsApp pricing?",
        answer:
          "Meta may only change rates on the first day of a quarter — 1 January, 1 April, 1 July or 1 October — and commits to at least one month's notice for a rate-card change, three months for a new pricing add-on, and six months for a change to the pricing model itself. So checking once a quarter is enough. One change is already scheduled: from 1 October 2026, Bangladesh, Iraq, Nepal, Sri Lanka, Kazakhstan, Kuwait, Morocco, Oman and Ukraine move out of their regional rates onto standalone rows.",
      },
      {
        question: "Does RateUp charge a markup on WhatsApp messages?",
        answer:
          "Meta's per-message charge is passed through, and RateUp's platform fee is a separate, flat subscription rather than a per-message markup — so your cost per message does not climb as you scale. See the pricing page for current plans.",
      },
      {
        question: "How accurate is this calculator?",
        answer:
          "It applies Meta's published rate card for your market, walks the volume tiers band by band on utility and authentication, and excludes the utility templates you tell it land inside an open service window — which is how Meta actually bills. That makes it as accurate as your own volume and service-window estimates. It does not model free-entry-point windows from Click-to-WhatsApp ads, which would push your bill lower still.",
      },
    ],
  },
  {
    slug: "rto-loss-calculator",
    name: "COD RTO Loss Calculator",
    headline: "COD Return-to-Origin (RTO) Loss Calculator",
    tagline:
      "Find out what refused cash-on-delivery orders actually cost your business every month — shipping, packaging and blocked working capital.",
    description:
      "Built for Indian D2C. Put a rupee figure on your COD RTO losses and see what a small reduction is worth.",
    icon: IconTruckReturn,
    category: "Calculators",
    badge: "India specific",
    cta: "Confirm every COD order on WhatsApp before you ship.",
    steps: [
      {
        n: "01",
        title: "Enter your real numbers",
        body: "Defaults are Indian D2C averages: 60% COD, 25% RTO, ₹70 each way. Replace them with yours — every assumption here is editable.",
      },
      {
        n: "02",
        title: "Read the breakdown",
        body: "One number hides the problem. Shipping burn, packaging burn and blocked working capital each have a different fix.",
      },
      {
        n: "03",
        title: "Model the recovery",
        body: "Address verification and a WhatsApp confirmation message before dispatch are the two levers that move RTO fastest.",
      },
    ],
    faqs: [
      {
        question: "What is RTO in ecommerce?",
        answer:
          "RTO stands for Return to Origin — an order that ships out but is never delivered, so the courier returns it to your warehouse. The customer refuses it at the door, is unreachable, or the address fails. You are not paid, but you still pay forward shipping, return shipping and packaging.",
      },
      {
        question: "What is a normal RTO rate for COD orders in India?",
        answer:
          "Most Indian D2C brands see 20–40% RTO on cash-on-delivery orders, against low single digits on prepaid. Categories with impulse purchases, tier-2 and tier-3 delivery pincodes, and high-value carts sit at the upper end of that range.",
      },
      {
        question: "How is RTO loss calculated?",
        answer:
          "For each returned order you lose forward shipping + return shipping + packaging. Multiply that by the number of COD orders that come back. Separately, the inventory inside those parcels is out of stock and unsellable for the two to three weeks it spends in transit — that is working capital blocked, which this calculator shows alongside the direct loss.",
      },
      {
        question: "How do I reduce COD RTO?",
        answer:
          "The highest-leverage fix is confirming the order with the customer before dispatch — an automated WhatsApp message asking them to confirm or cancel, which filters out accidental and low-intent orders while they are still cheap to cancel. Beyond that: nudge prepaid with a small discount, verify addresses and pincodes, cap COD on high-value carts, blocklist repeat refusers, and keep delivery expectations honest.",
      },
      {
        question: "Does WhatsApp COD confirmation actually work?",
        answer:
          "It works because it reaches people where they reply. An order confirmation sent on WhatsApp gets far higher engagement than an IVR call or SMS, and a single tap to confirm or cancel takes seconds. Brands typically target a several-percentage-point drop in RTO — use the recovery slider above to see what that is worth on your own numbers.",
      },
    ],
  },
  {
    slug: "nps-survey-templates",
    name: "NPS Survey Templates",
    headline: "NPS Survey Templates",
    tagline:
      "Ready-to-send Net Promoter Score questions written for your industry, with the follow-ups that actually get answered.",
    description:
      "15+ industry-specific NPS question sets, plus a calculator to score your responses. Copy, edit and send.",
    icon: IconMessage2Star,
    category: "Feedback & surveys",
    badge: "16 templates",
    cta: "Run NPS on WhatsApp and get replies, not silence.",
    steps: [
      {
        n: "01",
        title: "Pick your industry",
        body: "The rating question barely changes; the follow-up and the timing do all the work. Start from the closest template.",
      },
      {
        n: "02",
        title: "Send it on WhatsApp",
        body: "One question, quick-reply buttons, no forms. WhatsApp surveys clear far higher response rates than the same survey by email.",
      },
      {
        n: "03",
        title: "Route the answers",
        body: "Detractors go to a human immediately. Promoters get a referral or review ask while the goodwill is fresh.",
      },
    ],
    faqs: [
      {
        question: "What is a good NPS score?",
        answer:
          "Above 0 means you have more promoters than detractors. Above 30 is generally considered good, above 50 excellent and above 70 world class. Benchmarks vary sharply by industry, so compare against your own trend over time rather than against a global average.",
      },
      {
        question: "How is NPS calculated?",
        answer:
          "Ask customers how likely they are to recommend you on a 0–10 scale. Scores of 9–10 are promoters, 7–8 are passives, and 0–6 are detractors. NPS = %promoters − %detractors, giving a number between −100 and +100. Passives count towards the total but not towards either side.",
      },
      {
        question: "When should I send an NPS survey?",
        answer:
          "Send it after the customer has actually experienced the value, not immediately after payment. For ecommerce that is two to three days after delivery; for a restaurant, a few hours after the meal; for a clinic, a day after the appointment; for SaaS, after 30 days of active use.",
      },
      {
        question: "What follow-up question should I ask after NPS?",
        answer:
          "Change it by score. Promoters get 'What did we get right?' — their answer is your next testimonial. Passives get 'What would make it a 10?' — that is your roadmap. Detractors get 'What went wrong?' and, critically, a route to a human. One generic follow-up for everyone wastes the highest-signal moment you will get.",
      },
      {
        question: "Why send NPS surveys on WhatsApp?",
        answer:
          "Email NPS surveys typically see single-digit response rates. A one-tap survey delivered in WhatsApp, where the customer already reads messages, does substantially better — and the reply lands in a conversation you can continue rather than in an inbox nobody monitors.",
      },
    ],
  },
];

export const TOOL_CATEGORIES: ToolCategory[] = [
  "WhatsApp essentials",
  "Calculators",
  "Feedback & surveys",
];

export const getToolBySlug = (slug: string): ToolDefinition | undefined =>
  TOOLS.find((tool) => tool.slug === slug);

/** The other tools, for the "related tools" strip at the bottom of each page. */
export const getRelatedTools = (slug: string, limit = 3): ToolDefinition[] =>
  TOOLS.filter((tool) => tool.slug !== slug).slice(0, limit);

const SITE_URL = "https://rateup.app";

/** FAQPage JSON-LD, built from the same FAQ copy the page renders. */
export const buildFaqJsonLd = (faqs: ToolFaq[]) => ({
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

export const buildBreadcrumbJsonLd = (crumbs: { name: string; url: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: crumb.url,
  })),
});

/**
 * Structured data for a single tool page: the tool itself as a WebApplication,
 * its FAQ, and the breadcrumb trail back to the homepage.
 */
export const buildToolJsonLd = (tool: ToolDefinition) => {
  const url = `${SITE_URL}${toolPath(tool.slug)}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#app`,
        name: tool.headline,
        url,
        description: tool.tagline,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        browserRequirements: "Requires a modern web browser with JavaScript enabled",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
        },
        publisher: {
          "@type": "Organization",
          "@id": `${SITE_URL}#organization`,
          name: "RateUp",
          url: SITE_URL,
        },
      },
      buildFaqJsonLd(tool.faqs),
      buildBreadcrumbJsonLd([
        { name: "Home", url: SITE_URL },
        { name: "Tools", url: `${SITE_URL}${TOOLS_BASE_PATH}` },
        { name: tool.name, url },
      ]),
    ],
  };
};

/** ItemList JSON-LD for the /tools directory page. */
export const buildToolsIndexJsonLd = () => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ItemList",
      "@id": `${SITE_URL}${TOOLS_BASE_PATH}#tools`,
      name: "WhatsApp and customer engagement tools by RateUp",
      numberOfItems: TOOLS.length,
      itemListElement: TOOLS.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.name,
        url: `${SITE_URL}${toolPath(tool.slug)}`,
      })),
    },
    buildBreadcrumbJsonLd([
      { name: "Home", url: SITE_URL },
      { name: "Tools", url: `${SITE_URL}${TOOLS_BASE_PATH}` },
    ]),
  ],
});

export { SITE_URL as TOOLS_SITE_URL };
