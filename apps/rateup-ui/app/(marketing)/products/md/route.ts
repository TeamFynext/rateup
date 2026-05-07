// app/(marketing)/products/md/route.ts

export async function GET() {
  return new Response(
    `# RateUp Products

## Customer Engagement Suite

RateUp provides a complete suite of AI-powered customer engagement products.

## Products

- Omnichannel Inbox
- AI Automation
- WhatsApp Loyalty
- QR Studio
- WhatsApp Survey
- AI Review Management
- Ticketing System
- Testimonial Gateway

## Features

- WhatsApp Business API
- AI Chatbot
- Workflow Automation
- Shared Team Inbox
- Campaign Management
- Analytics Dashboard
- Customer Retention Tools
- Survey Automation

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
