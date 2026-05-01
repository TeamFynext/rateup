import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const accept = req.headers.get("accept") || "";

  // Check if agent wants markdown
  if (accept.includes("text/markdown")) {
    const markdown = `# RateUp

RateUp is a customer engagement platform.

## Features
- Campaign management
- Contact management
- WhatsApp messaging
- Chatbots
- Analytics

## API
Base URL: https://api.rateup.app/api

## Docs
https://docs.rateup.app
`;

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown",
      },
    });
  }

  return NextResponse.next();
}
