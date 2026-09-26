// The `Accept: text/markdown` twins of the product pages.

export const productsMarkdown = `# RateUp Products

RateUp is a customer engagement platform on the official WhatsApp Business API, with Instagram and Messenger in the same inbox.

## Products

- WhatsApp Business API (/products/whatsapp-business-api)
- WhatsApp Broadcast (/products/whatsapp-broadcast)
- WhatsApp Loyalty (/products/whatsapp-loyalty)
- WhatsApp Feedback (/products/whatsapp-feedback)
- WhatsApp Survey (/products/whatsapp-survey)
- Omnichannel Inbox (/products/omnichannel-inbox)
- Pipeline (/products/pipeline)
- Meta AI Agent (/products/meta-ai-agent)
- Shared Team Inbox (/products/inbox)
- AI Automation (/products/ai-automation)
- AI Review Management (/products/ai-review)
- QR Studio (/products/qr-studio)
- Digital Suggestion Box (/products/qr)
- Testimonial Gateway (/products/testimonial-gateway)

## Integrations

- Shopify (/integrations/shopify) — one-click install from the Shopify App Store, loyalty points on paid orders, order-event and abandoned-checkout WhatsApp messages, post-purchase feedback
- WooCommerce, Petpooja (POS), Zoho (CRM), GetLead, Zapier, REST API and outbound webhooks
- Full list: /integrations

## API

https://api.rateup.app/api

## Docs

https://docs.rateup.app
`;

/**
 * One product page as Markdown, built from the same arrays the page renders so the two cannot
 * drift apart.
 */
export function productMarkdown({
  name,
  path,
  summary,
  features,
  faqs,
}: Readonly<{
  name: string;
  path: string;
  summary: string;
  features: readonly string[];
  faqs: readonly { question: string; answer: string }[];
}>): string {
  return `# RateUp ${name}

${summary}

URL: https://rateup.app${path}

## What it does

${features.map((feature) => `- ${feature}`).join("\n")}

## FAQ

${faqs.map((faq) => `### ${faq.question}\n\n${faq.answer}`).join("\n\n")}

## Next steps

- Pricing: https://rateup.app/pricing
- Book a demo: https://rateup.app/book-a-demo
- All products: https://rateup.app/products/whatsapp-business-api
`;
}
