/**
 * Registry for the no-signup tools served under `/tools`.
 *
 * This is the single source of truth for the tools sidebar, the `/tools` index,
 * the tools sitemap, cross-links between tools and the FAQ JSON-LD on each page.
 * Adding a tool = add an entry here + a route + a component + its icon in `ToolsIndex`.
 * Icon-free because route `head`s read it, and those land in the client entry.
 */
export type ToolCategory =
  | "WhatsApp essentials"
  | "Calculators"
  | "Ecommerce essentials"
  | "Feedback & surveys";

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

export interface ToolSoftwareApp {
  name: string;
  description: string;
  applicationCategory: "UtilityApplication" | "BusinessApplication";
  featureList: string[];
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
  category: ToolCategory;
  /** Third pill in the hero, after "No signup" and "No email gate". */
  badge: string;
  /** Three-step "How it works" band below the tool. */
  steps: ToolStep[];
  /** Headline for the closing conversion band. */
  cta: string;
  faqs: ToolFaq[];
  softwareApp: ToolSoftwareApp;
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
    softwareApp: {
      name: "WhatsApp Link Generator",
      description:
        "Free WhatsApp link generator that creates wa.me click-to-chat links with an optional prefilled message. Runs entirely in your browser — no signup, no expiry, works on mobile and desktop.",
      applicationCategory: "UtilityApplication",
      featureList: [
        "Generate wa.me click-to-chat links",
        "Add a prefilled message with automatic URL encoding",
        "Automatic phone number normalisation to international format",
        "Works on mobile and desktop",
        "No signup, no link expiry",
      ],
    },
  },
  {
    slug: "whatsapp-qr-code-generator",
    name: "WhatsApp QR Code Generator",
    headline: "WhatsApp QR Code Generator",
    tagline:
      "Generate a scannable WhatsApp QR code for your packaging, receipts, counter or table tents. Download as PNG or SVG.",
    description:
      "Turn your WhatsApp number into a print-ready QR code. High error correction, custom colour, PNG and SVG download.",
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
    softwareApp: {
      name: "WhatsApp QR Code Generator",
      description:
        "Free WhatsApp QR code generator that turns your number and an optional prefilled message into a print-ready QR code. Level H error correction for packaging and print, custom colours, PNG and SVG download. Generated in your browser — no signup, no watermark, no expiry.",
      applicationCategory: "UtilityApplication",
      featureList: [
        "Generate a QR code from your WhatsApp number and optional prefilled message",
        "Level H error correction — scans with up to 30% of the code damaged or covered",
        "Custom colour options",
        "PNG download for print, SVG for design files",
        "Generated in your browser, not on a server",
        "No signup, no watermark, no expiry",
      ],
    },
  },
  {
    slug: "whatsapp-pricing-calculator",
    name: "WhatsApp API Pricing Calculator",
    headline: "WhatsApp Business API Pricing Calculator",
    tagline:
      "Estimate what Meta will charge you per month for marketing, utility and authentication messages — by country and volume.",
    description:
      "Work out your monthly WhatsApp Business API bill from Meta's per-message rates, in USD and INR.",
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
    softwareApp: {
      name: "WhatsApp API Pricing Calculator",
      description:
        "Free calculator for your monthly WhatsApp Business API bill using Meta's published per-message rates for your market. Handles marketing, utility and authentication categories, walks volume tiers band by band, and excludes utility templates sent inside an open service window. Results in USD and INR. No signup required.",
      applicationCategory: "BusinessApplication",
      featureList: [
        "Meta's published rate card by country and message category",
        "Marketing, utility and authentication message pricing",
        "Band-by-band volume tier calculation for utility and authentication",
        "Excludes utility templates sent inside an open service window",
        "Monthly bill estimate in USD and INR",
        "No signup, runs in your browser",
      ],
    },
  },
  {
    slug: "rto-loss-calculator",
    name: "COD RTO Loss Calculator",
    headline: "COD Return-to-Origin (RTO) Loss Calculator",
    tagline:
      "Find out what refused cash-on-delivery orders actually cost your business every month — shipping, packaging and blocked working capital.",
    description:
      "Built for Indian D2C. Put a rupee figure on your COD RTO losses and see what a small reduction is worth.",
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
    softwareApp: {
      name: "COD RTO Loss Calculator",
      description:
        "Free calculator that shows what Return to Origin (RTO) on cash-on-delivery orders is costing your ecommerce brand — direct shipping and packaging losses plus working capital blocked in returned inventory, with a recovery slider to model the impact of reducing your RTO rate. No signup required.",
      applicationCategory: "BusinessApplication",
      featureList: [
        "Calculate direct RTO loss from forward shipping, return shipping and packaging",
        "Estimate working capital blocked in returned inventory",
        "Recovery slider to model savings from reducing RTO rate",
        "Benchmarks for COD RTO rates of Indian D2C brands",
        "No signup, runs in your browser",
      ],
    },
  },
  {
    slug: "nps-survey-templates",
    name: "NPS Survey Templates",
    headline: "NPS Survey Templates",
    tagline:
      "Ready-to-send Net Promoter Score questions written for your industry, with the follow-ups that actually get answered.",
    description:
      "15+ industry-specific NPS question sets, plus a calculator to score your responses. Copy, edit and send.",
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
    softwareApp: {
      name: "NPS Survey Templates + NPS Calculator",
      description:
        "Ready-to-send NPS survey templates for ecommerce, restaurants, clinics, salons, SaaS and more — with score-based follow-ups for promoters, passives and detractors, recommended send timing, and a built-in NPS score calculator. No signup, no email gate.",
      applicationCategory: "BusinessApplication",
      featureList: [
        "16 NPS survey templates across 5 industry groups",
        "Score-based follow-up questions for promoters, passives and detractors",
        "Recommended send timing per industry",
        "Built-in NPS score calculator (promoters, passives, detractors)",
        "Copy-and-edit templates for WhatsApp delivery",
        "No signup, no email gate",
      ],
    },
  },
  {
    slug: "shopify-bulk-discount-code-generator",
    name: "Shopify Bulk Discount Code Generator",
    headline: "Shopify Bulk Discount Code Generator",
    tagline:
      "Generate random, unique discount codes for your Shopify store in bulk and download a CSV ready to import.",
    description: "Generate bulk unique discount codes and export them as a Shopify-ready CSV.",
    category: "Ecommerce essentials",
    badge: "Shopify ready",
    cta: "Send codes via WhatsApp automatically.",
    steps: [],
    faqs: [
      {
        question: "How do I import these discount codes into Shopify?",
        answer:
          "Go to your Shopify Admin, navigate to Discounts, and create a new discount (or edit an existing one). Under the 'Discount code' section, click 'Manage' or 'Import' and upload the CSV file generated by this tool.",
      },
      {
        question: "Why should I use unique discount codes instead of a single code?",
        answer:
          "Single codes like 'WELCOME10' frequently leak to coupon-sharing sites like Honey or RetailMeNot, eating into your margins. Unique codes ensure the discount is only used by the intended recipient once.",
      },
      {
        question: "What does 'Exclude ambiguous characters' mean?",
        answer:
          "It removes characters that look similar and confuse customers—like the letter 'O' and the number '0', or the letter 'I', lowercase 'l', and number '1'. This prevents customer support tickets about 'invalid' codes.",
      },
    ],
    softwareApp: {
      name: "Shopify Bulk Discount Generator",
      description: "Generate bulk unique discount codes",
      applicationCategory: "UtilityApplication",
      featureList: [],
    },
  },
  {
    slug: "clv-calculator",
    name: "CLV Calculator",
    headline: "Customer Lifetime Value Calculator",
    tagline:
      "Calculate your LTV:CAC ratio and find out if you are under-investing or burning money.",
    description: "Calculate Customer Lifetime Value, payback period and LTV:CAC ratio.",
    category: "Calculators",
    badge: "Growth metric",
    cta: "Improve LTV with WhatsApp retention.",
    steps: [],
    faqs: [
      {
        question: "What is a good LTV:CAC ratio?",
        answer:
          "A ratio of 3:1 is generally considered the benchmark for a healthy ecommerce business—meaning you make three times what you spend to acquire a customer. If it's 1:1, you're losing money after operating costs. If it's 5:1 or higher, you might be under-investing in marketing and missing out on growth.",
      },
      {
        question: "How can I improve my Customer Lifetime Value (CLV)?",
        answer:
          "The fastest way to improve CLV is by increasing purchase frequency. You can do this by running targeted retention campaigns (like WhatsApp win-backs or VIP offers), launching a loyalty program, or introducing subscription options.",
      },
      {
        question: "What is payback period?",
        answer:
          "Payback period is the time it takes for a customer's gross profit to cover the cost of acquiring them (CAC). A shorter payback period means you recover your cash faster, allowing you to reinvest it back into ads.",
      },
    ],
    softwareApp: {
      name: "CLV Calculator",
      description: "Calculate Customer Lifetime Value",
      applicationCategory: "UtilityApplication",
      featureList: [],
    },
  },
  {
    slug: "shopify-fee-calculator",
    name: "Shopify Fee Calculator",
    headline: "Shopify Transaction Fee Calculator",
    tagline:
      "Work out every fee Shopify and your payment gateway take from an order — and the profit that is left.",
    description:
      "Shopify transaction fees, gateway charges and GST per order, for India and the US — plus your monthly total.",
    category: "Calculators",
    badge: "Shopify fees",
    cta: "Reduce RTO to offset gateway fees.",
    steps: [
      {
        n: "01",
        title: "Pick your store and plan",
        body: "Choose India or the US and your Shopify plan. That sets Shopify's transaction fee and, in the US, the Shopify Payments card rate.",
      },
      {
        n: "02",
        title: "Enter the order",
        body: "Sale price, product cost, the shipping you pay and your gateway's rate. In India, add GST on the fees — it is a real cost unless you claim it back.",
      },
      {
        n: "03",
        title: "See it at volume",
        body: "Enter your monthly orders to see what fees cost you over a month — the number to weigh against a plan upgrade.",
      },
    ],
    faqs: [
      {
        question: "What is the Shopify transaction fee?",
        answer:
          "It is a percentage Shopify charges on each order paid through a third-party payment provider instead of Shopify Payments: 2% on Basic, 1% on Grow, 0.6% on Advanced and 0.2% on Plus. It is charged on top of the provider's own fee. Orders paid through Shopify Payments carry no Shopify transaction fee.",
      },
      {
        question: "Does Shopify charge transaction fees in India?",
        answer:
          "Yes. Shopify Payments is not available in India, so Indian stores use a gateway such as Razorpay, PayU or Cashfree and pay Shopify's transaction fee on every order — 2% on Basic, 1% on Grow and 0.6% on Advanced — plus the gateway's fee, usually around 2%. GST at 18% applies to these fees as well.",
      },
      {
        question: "What are Shopify Payments fees in the US?",
        answer:
          "For online card payments, Shopify Payments charges about 2.9% + 30¢ on Basic, 2.7% + 30¢ on Grow and 2.5% + 30¢ on Advanced, with no extra Shopify transaction fee. International and currency-converted cards cost more. Check your Shopify admin under Settings → Payments for your exact rates.",
      },
      {
        question: "Are Shopify transaction fees charged on COD orders?",
        answer:
          "No. Shopify does not charge transaction fees on manual payment methods such as cash on delivery and bank transfer, and no gateway fee applies either. Your courier charges its own COD fee instead, and some COD apps add a per-order fee of their own — check the app's pricing if you use one.",
      },
      {
        question: "When should I upgrade my Shopify plan to save on fees?",
        answer:
          "When the transaction fees you save are more than the extra plan cost. In India, moving from Basic to Grow cuts Shopify's fee from 2% to 1%, which pays off once your monthly online revenue is above roughly the difference in plan price divided by 1%. Our Shopify Profit Calculator compares the plans on your own revenue.",
      },
    ],
    softwareApp: {
      name: "Shopify Fee Calculator",
      description:
        "Free Shopify transaction fee calculator for India and the US. Calculates Shopify's transaction fee by plan, payment gateway or Shopify Payments charges, GST on fees, app fees and net profit per order, plus total fees per month at your order volume. No signup required.",
      applicationCategory: "BusinessApplication",
      featureList: [
        "Shopify transaction fee by plan: Basic, Grow, Advanced",
        "India mode with third-party gateway and 18% GST on fees",
        "US mode with Shopify Payments card rates",
        "Net profit and margin per order",
        "Monthly fees at your order volume",
        "No signup, runs in your browser",
      ],
    },
  },
  {
    slug: "profit-margin-calculator",
    name: "Profit Margin Calculator",
    headline: "Shopify Profit Margin Calculator",
    tagline:
      "Calculate gross margin, net margin, markup and breakeven ROAS per order — with Shopify's transaction fee built in, or for any other store.",
    description:
      "Gross margin, net margin, markup and breakeven ROAS per order, with Shopify fees built in.",
    category: "Calculators",
    badge: "Margin analysis",
    cta: "Improve net margin with higher RTO delivery.",
    steps: [
      {
        n: "01",
        title: "Pick where you sell",
        body: "Choose your Shopify plan to fill in Shopify's transaction fee, or switch to another platform and enter its commission.",
      },
      {
        n: "02",
        title: "Add every cost",
        body: "Product cost, shipping, packaging, ad spend per order and your gateway fee. Leave nothing out — small costs are what turn a healthy gross margin into a thin net one.",
      },
      {
        n: "03",
        title: "Check your breakeven ROAS",
        body: "If your ads return less than this, each order they bring in loses money. Use it as the floor for every campaign.",
      },
    ],
    faqs: [
      {
        question: "How do I calculate profit margin on Shopify?",
        answer:
          "Subtract every cost of an order from its selling price, then divide by the selling price. On Shopify that means product cost, shipping, packaging, ad spend per order, your payment gateway fee and Shopify's own transaction fee. Gross margin counts only product cost; net margin counts everything.",
      },
      {
        question: "What is a good profit margin for a Shopify store?",
        answer:
          "Gross margins of 50–70% are common for D2C brands that make their own products; resellers often run 20–40%. Net margin after shipping, ads and fees is much lower — 10–20% is healthy for most stores. If your gross margin is under 40%, paid ads rarely leave room for profit.",
      },
      {
        question: "Does Shopify take a cut of each sale in India?",
        answer:
          "Yes. Shopify Payments is not available in India, so you use a third-party gateway such as Razorpay, PayU or Cashfree, and Shopify charges its own transaction fee on top: about 2% on Basic, 1% on Grow and 0.6% on Advanced. Your gateway charges its own fee as well, usually around 2%.",
      },
      {
        question: "What is the difference between Gross Margin and Net Margin?",
        answer:
          "Gross Margin only subtracts the Cost of Goods Sold (COGS) from your selling price. Net Margin subtracts all other variable costs as well—including shipping, packaging, payment gateway fees, and ad spend—giving you the true profit you take home per order.",
      },
      {
        question: "What is Breakeven ROAS?",
        answer:
          "Breakeven Return on Ad Spend (ROAS) is the minimum ad performance you need to not lose money on an order. If your Breakeven ROAS is 2.5x, any ad campaign bringing in less than ₹2.50 for every ₹1 spent is unprofitable.",
      },
      {
        question: "How can I improve my net profit margin?",
        answer:
          "You can improve net margin by reducing COGS through bulk supplier negotiations, lowering shipping costs, increasing your Average Order Value (AOV) so fixed costs take up a smaller percentage, or reducing RTO (Return to Origin) losses.",
      },
    ],
    softwareApp: {
      name: "Profit Margin Calculator",
      description: "Calculate gross margin, net margin, markup and breakeven ROAS",
      applicationCategory: "UtilityApplication",
      featureList: [],
    },
  },
  {
    slug: "shopify-conversion-rate-calculator",
    name: "Shopify Conversion Rate Calculator",
    headline: "Shopify Conversion Rate Calculator",
    tagline:
      "Find your store's conversion rate, see which step of the funnel leaks the most, and what a small lift is worth in rupees.",
    description:
      "Conversion rate, cart and checkout abandonment, revenue per session — and the revenue a higher rate would add.",
    category: "Calculators",
    badge: "Shopify analytics",
    cta: "Win back abandoned checkouts on WhatsApp.",
    steps: [
      {
        n: "01",
        title: "Copy your funnel",
        body: "Open Shopify Analytics and find the conversion rate breakdown. Copy sessions, added to cart, reached checkout and orders for the same date range.",
      },
      {
        n: "02",
        title: "Find the leak",
        body: "The overall rate hides where people drop out. A low add-to-cart rate points at product pages; high checkout abandonment points at shipping cost, COD or payment trouble.",
      },
      {
        n: "03",
        title: "Price the fix",
        body: "Move the slider to see what a higher conversion rate earns on the traffic you already pay for — then decide what is worth fixing first.",
      },
    ],
    faqs: [
      {
        question: "How is Shopify conversion rate calculated?",
        answer:
          "Conversion rate is orders divided by sessions, multiplied by 100. If your store had 40,000 sessions and 640 orders in a month, your conversion rate is 640 ÷ 40,000 × 100 = 1.6%. Shopify counts sessions, not unique visitors, so one person visiting twice counts as two sessions.",
      },
      {
        question: "What is a good conversion rate for a Shopify store?",
        answer:
          "Most ecommerce stores convert between 1% and 3% of sessions. Above 3% is strong. It varies a lot by category and price — low-priced consumables and repeat-purchase brands convert higher, expensive or considered purchases convert lower. Compare yourself to your own past months first, then to stores like yours.",
      },
      {
        question: "Where do I find these numbers in Shopify?",
        answer:
          "In Shopify admin, go to Analytics and open the conversion rate breakdown report. It shows sessions, sessions with add to cart, sessions that reached checkout and sessions that completed checkout for the date range you pick. Use the same date range for every number.",
      },
      {
        question: "What is the difference between cart abandonment and checkout abandonment?",
        answer:
          "Cart abandonment is people who added a product to cart but never started checkout — often they were browsing or comparing. Checkout abandonment is people who started checkout and entered details but did not pay — usually surprise shipping costs, missing COD, payment failures or a slow form. Checkout abandoners are the most valuable to win back, because they were closest to buying.",
      },
      {
        question: "How do I improve my store's conversion rate?",
        answer:
          "Fix the step with the biggest drop. For add to cart: better product photos, clear prices, reviews and fast pages on mobile. For checkout: show shipping costs early, offer COD where it makes sense, and cut form fields. Then win back the people who still leave — a WhatsApp message with their cart link, sent within an hour, recovers far more checkouts than email alone.",
      },
    ],
    softwareApp: {
      name: "Shopify Conversion Rate Calculator",
      description:
        "Free calculator for Shopify store conversion rate. Enter sessions, add-to-cart, checkout and order counts to get your conversion rate, cart and checkout abandonment, revenue per session, and the extra revenue a higher conversion rate would bring. No signup required.",
      applicationCategory: "BusinessApplication",
      featureList: [
        "Calculate store conversion rate from sessions and orders",
        "Cart abandonment and checkout abandonment rates",
        "Revenue per session",
        "Slider to model extra revenue from a higher conversion rate",
        "No signup, runs in your browser",
      ],
    },
  },
  {
    slug: "shopify-shipping-cost-calculator",
    name: "Shopify Shipping Cost Calculator",
    headline: "Shopify Shipping Cost Calculator",
    tagline:
      "Work out what each parcel really costs to ship — chargeable weight, delivery zone, COD charge and GST — and how much of your profit it takes.",
    description:
      "Volumetric vs actual weight, 500 g slabs, zone rates, COD and GST — your true shipping cost per order.",
    category: "Calculators",
    badge: "India specific",
    cta: "Confirm COD orders on WhatsApp before you ship.",
    steps: [
      {
        n: "01",
        title: "Measure the parcel",
        body: "Weigh it packed and measure the outer box. Couriers bill on whichever is bigger — actual weight or length × width × height ÷ 5000 — rounded up to the next 500 g.",
      },
      {
        n: "02",
        title: "Enter your rate card",
        body: "Pick the delivery zone to pre-fill example rates, then type in the first-500 g and extra-500 g rates from your own courier or shipping aggregator.",
      },
      {
        n: "03",
        title: "Decide who pays",
        body: "Set what you charge at checkout and your margin. If free shipping eats too much of the profit, raise the free-shipping threshold or fix the box size.",
      },
    ],
    faqs: [
      {
        question: "How is shipping cost calculated in India?",
        answer:
          "Couriers charge by chargeable weight and delivery zone. Chargeable weight is the higher of the parcel's actual weight and its volumetric weight, rounded up to the next 500 g. You pay a rate for the first 500 g and a rate for every extra 500 g, plus a COD charge on cash-on-delivery orders, plus 18% GST.",
      },
      {
        question: "What is volumetric weight and how do I calculate it?",
        answer:
          "Volumetric weight is how much space a parcel takes up, expressed as weight. Multiply length × width × height in centimetres and divide by 5000 (the divisor most Indian couriers use). A 25 × 20 × 10 cm box has a volumetric weight of 1 kg — so even if the product inside weighs 400 g, you are billed for 1 kg.",
      },
      {
        question: "What are shipping zones A, B, C, D and E?",
        answer:
          "Indian couriers and shipping aggregators group deliveries by distance. Zone A is within the same city, B within the same state or region, C between metro cities, D the rest of India, and E special areas such as the North East and Jammu & Kashmir. Rates rise from A to E. Exact zone rules vary slightly by courier.",
      },
      {
        question: "How much is the COD charge?",
        answer:
          "Most couriers charge a flat minimum or a percentage of the order value, whichever is higher — commonly around ₹35–50 or 1.5–2.5%. It is charged on every COD shipment, and many couriers still charge it, or a return fee, when the parcel comes back undelivered.",
      },
      {
        question: "Should my Shopify store offer free shipping?",
        answer:
          "Free shipping lifts conversion, but you pay the cost. Use this calculator to see how much of your gross profit shipping takes on a typical order. A common approach is to set the free-shipping threshold a little above your average order value, so customers add one more item to qualify and the bigger basket covers the shipping.",
      },
      {
        question: "Where do I set shipping rates in Shopify?",
        answer:
          "In Shopify admin, go to Settings → Shipping and delivery. Create shipping zones and add flat rates, rates by weight or price, or a free-shipping rate above a minimum order value. Indian stores usually ship through a courier or shipping aggregator app that connects to Shopify and books the parcels.",
      },
    ],
    softwareApp: {
      name: "Shopify Shipping Cost Calculator",
      description:
        "Free shipping cost calculator for Shopify stores in India. Calculates volumetric and chargeable weight, freight by zone in 500 g slabs, COD charges and GST, the extra cost of an oversized box, and how much of the order's gross profit shipping takes. No signup required.",
      applicationCategory: "BusinessApplication",
      featureList: [
        "Volumetric vs actual weight with 500 g slab rounding",
        "Zone A–E example rates, fully editable",
        "COD charge as minimum fee or percentage of order value",
        "18% GST on freight and COD",
        "Shows the extra cost of an oversized box",
        "Share of gross profit spent on shipping",
        "No signup, runs in your browser",
      ],
    },
  },
  {
    slug: "shopify-profit-calculator",
    name: "Shopify Profit Calculator",
    headline: "Shopify Profit Calculator",
    tagline:
      "See what your store actually made this month — after product cost, shipping, returns, payment and Shopify fees, ads and overheads.",
    description:
      "Monthly net profit, break-even orders, ROAS and the cheapest Shopify plan for your revenue.",
    category: "Calculators",
    badge: "Shopify India",
    cta: "Grow repeat orders without more ad spend.",
    steps: [
      {
        n: "01",
        title: "Enter last month",
        body: "Orders and average order value from Shopify Analytics, your return and RTO rate, and the costs from your courier, gateway and bank statement.",
      },
      {
        n: "02",
        title: "Read the profit and loss",
        body: "Revenue minus everything it took to earn it. Contribution shows what orders earn before fixed costs — if it is negative, more orders make things worse.",
      },
      {
        n: "03",
        title: "Find the cheapest fix",
        body: "Check your break-even orders, ad efficiency and Shopify plan. Often the quickest win is fewer returns or a plan change, not more traffic.",
      },
    ],
    faqs: [
      {
        question: "How do I calculate profit for my Shopify store?",
        answer:
          "Start with revenue from delivered orders. Subtract product cost, shipping (including return shipping on RTO and returns), packaging, payment gateway fees and Shopify's transaction fee — that is contribution. Then subtract monthly fixed costs: ad spend, your Shopify plan, apps, salaries and rent. What is left is net profit.",
      },
      {
        question: "Does Shopify charge a transaction fee in India?",
        answer:
          "Yes. Shopify Payments is not available in India, so stores use a third-party gateway such as Razorpay, PayU or Cashfree, and Shopify adds its own transaction fee on top of the gateway's: about 2% on Basic, 1% on Grow and 0.6% on Advanced. Check Settings → Plan in your Shopify admin for the exact rate on your account.",
      },
      {
        question: "When should I upgrade my Shopify plan?",
        answer:
          "When the transaction fees you save are more than the extra monthly fee. Going from Basic to Grow cuts the fee from 2% to 1%, so it pays off once your monthly revenue is roughly above the difference in plan price divided by 1%. The plan comparison in this calculator does that maths on your own revenue.",
      },
      {
        question: "What is break-even orders?",
        answer:
          "It is how many orders you need each month for the profit on those orders to cover your fixed costs — ads, Shopify plan, apps, salaries and rent. Below that number you lose money; every order above it is profit. If your profit per order is zero or negative, there is no break-even point and more orders only increase the loss.",
      },
      {
        question: "How do returns and RTO affect Shopify profit?",
        answer:
          "A returned or undelivered order earns nothing, but you still paid to ship it out, pay again to ship it back, and lose the packaging. At a 15–25% return and RTO rate, that is often the single biggest leak in an Indian D2C store's profit — bigger than Shopify's fees.",
      },
    ],
    softwareApp: {
      name: "Shopify Profit Calculator",
      description:
        "Free monthly profit calculator for Shopify stores in India. Calculates net profit and margin after product cost, shipping, returns and RTO, payment gateway and Shopify transaction fees, ads and overheads, plus break-even orders, ROAS, ad cost per order and the cheapest Shopify plan for your revenue. No signup required.",
      applicationCategory: "BusinessApplication",
      featureList: [
        "Monthly net profit and net margin",
        "Returns and RTO cost included",
        "Payment gateway and Shopify transaction fees",
        "Break-even orders per month",
        "ROAS and ad cost per order",
        "Compare Shopify Basic, Grow and Advanced at your revenue",
        "No signup, runs in your browser",
      ],
    },
  },
];

export const TOOL_CATEGORIES: ToolCategory[] = [
  "WhatsApp essentials",
  "Calculators",
  "Ecommerce essentials",
  "Feedback & surveys",
];

export const getToolBySlug = (slug: string): ToolDefinition | undefined =>
  TOOLS.find((tool) => tool.slug === slug);

/** The other tools, for the "related tools" strip at the bottom of each page. */
export const getRelatedTools = (slug: string, limit = 3): ToolDefinition[] =>
  TOOLS.filter((tool) => tool.slug !== slug).slice(0, limit);

const SITE_URL = "https://rateup.app";

/** FAQPage JSON-LD, matching the FAQ Schema in the SEO document. */
export const buildFaqJsonLd = (faqs: ToolFaq[]) => ({
  "@context": "https://schema.org",
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

/** SoftwareApplication JSON-LD, matching the Tool Schema in the SEO document. */
export const buildToolSoftwareAppJsonLd = (tool: ToolDefinition) => {
  const url = `${SITE_URL}${toolPath(tool.slug)}`;

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.softwareApp.name,
    url,
    description: tool.softwareApp.description,
    applicationCategory: tool.softwareApp.applicationCategory,
    operatingSystem: "Any",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    featureList: tool.softwareApp.featureList,
    publisher: {
      "@type": "Organization",
      name: "RateUp",
      url: SITE_URL,
    },
  };
};

export const buildBreadcrumbJsonLd = (crumbs: { name: string; url: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: crumb.url,
  })),
});

/** FAQ Schema + Tool Schema for a tool page, passed to `buildPageHead(path, { jsonLd })`. */
export const buildToolJsonLd = (tool: ToolDefinition) => [
  buildFaqJsonLd(tool.faqs),
  buildToolSoftwareAppJsonLd(tool),
];

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
