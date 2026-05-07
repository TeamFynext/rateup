// app/(marketing)/about-us/md/route.ts

export async function GET() {
  return new Response(
    `# About RateUp

RateUp is an AI-powered customer engagement platform designed to help businesses build stronger customer relationships through automation, omnichannel communication, and intelligent workflows.

## Our Mission

Our mission is to simplify customer engagement for modern businesses by providing powerful tools for communication, retention, support, and growth — all from a unified platform.

## What We Do

RateUp enables businesses to:

- Manage customer conversations from a shared omnichannel inbox
- Automate support and engagement using AI
- Run WhatsApp marketing and loyalty campaigns
- Collect customer feedback through surveys
- Track analytics and customer interactions
- Improve retention with personalized engagement

## Core Features

- Omnichannel Inbox
- WhatsApp Business API
- AI Chatbot & Automation
- Campaign Management
- Loyalty Programs
- QR Campaigns
- Ticketing System
- Team Collaboration
- Analytics Dashboard
- Customer Feedback & Surveys

## Industries We Serve

- E-commerce
- D2C Brands
- Restaurants
- Retail Stores
- Hospitality
- Service Businesses
- Multi-location Enterprises

## Technology

RateUp combines AI-driven automation with scalable communication infrastructure to help teams engage customers efficiently across multiple channels.

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
