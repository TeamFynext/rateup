// app/(marketing)/book-demo/md/route.ts

export async function GET() {
  return new Response(
    `# Book a Demo - RateUp

Book a personalized demo of the RateUp customer engagement platform.

## What You'll See

- Omnichannel Inbox
- AI Chatbot & Automation
- WhatsApp Business API Integration
- Campaign Management
- Shared Team Inbox
- Customer Retention Workflows
- Loyalty Campaigns
- Analytics Dashboard
- Ticketing System
- QR Campaign Automation

## Demo Highlights

- Personalized walkthrough
- Industry-specific use cases
- Automation setup examples
- AI-powered customer engagement
- Team collaboration features
- WhatsApp marketing workflows

## Ideal For

- E-commerce businesses
- D2C brands
- Customer support teams
- Restaurants
- Retail chains
- Multi-location businesses

## Booking

The demo typically lasts 30 minutes and includes a live walkthrough of the platform.

## Website

https://rateup.app

## API

https://api.rateup.app/api

## Docs

https://docs.rateup.app
`,
    {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    },
  );
}
