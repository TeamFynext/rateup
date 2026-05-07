// app/(marketing)/pricing/md/route.ts

export async function GET() {
  return new Response(
    `# RateUp Pricing

RateUp offers flexible pricing plans for businesses of all sizes.

## Plans

### Starter
Best for small businesses getting started with customer engagement.

Features:
- Omnichannel Inbox
- AI Chatbot
- Shared Team Inbox
- Basic Automation
- WhatsApp Integration

### Growth
Built for growing teams and customer support operations.

Features:
- Advanced Workflow Automation
- Campaign Management
- AI-Powered Customer Engagement
- Analytics Dashboard
- Multi-Agent Collaboration
- WhatsApp Loyalty Campaigns

### Enterprise
Designed for large organizations requiring scale and customization.

Features:
- Multi-Branch Management
- Dedicated Support
- Custom Integrations
- Advanced Security
- Enterprise Analytics
- API Access
- Priority Infrastructure

## Included Features

- WhatsApp Business API
- AI Automation
- Shared Inbox
- Ticketing System
- Surveys & Feedback
- Customer Retention Tools
- QR Campaigns
- Real-time Analytics

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
