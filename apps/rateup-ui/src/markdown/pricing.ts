// src/routes/(marketing)/_markdown/pricing.ts

function formatPrice(amount?: number, currency?: string, period?: string) {
  if (!amount) return "Custom Pricing";

  return `${currency || "INR"} ${(amount / 100).toLocaleString()} / ${period || "plan"}`;
}

function getPlanHighlights(plan: any) {
  const features = plan.features || {};

  return [
    features.team?.active ? `${features.team?.count?.max || 0} Teams` : null,
    features.team?.teamMember?.active
      ? `${features.team?.teamMember?.count?.max || 0} Users`
      : null,
    features.whatsapp?.active
      ? `WhatsApp Messaging (${features.whatsapp?.count?.monthlyMessageLimit || 0} monthly messages)`
      : null,
    features.whatsapp?.automation?.active
      ? `${features.whatsapp?.automation?.automationTrigger?.count?.max || 0} Automation Triggers`
      : null,
    features.whatsapp?.campaign?.active
      ? `${features.whatsapp?.campaign?.count?.max || 0} WhatsApp Campaigns`
      : null,
    features.webSurvey?.active
      ? `${features.webSurvey?.count?.max || 0} Web Surveys`
      : null,
    features.loyalty?.active ? "WhatsApp Loyalty Program" : null,
    features.ticket?.active
      ? `${features.ticket?.count?.max || 0} Ticketing Seats`
      : null,
    features.menu?.active ? `${features.menu?.count?.max || 0} Digital Menus` : null,
    features.reputationManagement?.active ? "Reputation Management" : null,
    features.ai?.active
      ? `AI Tokens (${features.ai?.count?.promptTokens || 0} prompt tokens)`
      : null,
  ].filter(Boolean);
}

export function buildPricingMarkdown(plans: any[]) {
  return `
# RateUp Pricing

RateUp is an AI-powered customer engagement platform for WhatsApp marketing, omnichannel support, loyalty automation, customer retention, surveys, ticketing, and workflow automation.

Businesses use RateUp to:
- Manage customer conversations
- Run WhatsApp campaigns
- Automate support workflows
- Launch loyalty programs
- Track analytics
- Centralize team communication
- Improve customer retention

## Platform Features

- Omnichannel Inbox
- WhatsApp CRM
- AI Automation
- Shared Team Inbox
- Ticketing System
- Customer Loyalty Programs
- Surveys & Feedback Collection
- Broadcast Campaigns
- Drip Campaigns
- Workflow Automation
- Analytics Dashboard
- Reputation Management
- Digital Menus
- Multi-Agent Collaboration

## Available Pricing Plans

${plans
  .map((plan: any) => {
    const payment = plan.paymentPlan;
    const description = Array.isArray(plan.description)
      ? plan.description.map((item: string) => `- ${item}`).join("\n")
      : "- Customer engagement tools";
    const googleReviewLine = plan.features?.webSurvey?.googleReview?.active
      ? "- Google Review Integration"
      : "";
    const emailNotificationLine = plan.features?.webSurvey?.emailNotification
      ?.active
      ? "- Email Notifications"
      : "";
    const htmlEmbedLine = plan.features?.webSurvey?.htmlCodePage?.active
      ? "- HTML Embed Support"
      : "";

    return `
---

## ${plan.displayName || plan.name}

### Plan Information

- Plan Name: ${plan.name}
- Pricing: ${formatPrice(payment?.amount, payment?.currency, payment?.period)}
- Billing Cycle: ${payment?.period || "Custom"}
- Trial Period: ${plan.trialDays || 0} days
- Plan Type: ${plan.planType}

### Included Features

${getPlanHighlights(plan)
  .map((feature) => `- ${feature}`)
  .join("\n")}

### Description

${description}

### Technical Capabilities

${
  plan.features?.whatsapp?.active
    ? `
#### WhatsApp Features
- WhatsApp Automation
- WhatsApp Campaigns
- WhatsApp Templates
- WhatsApp Surveys
- WhatsApp Flows
- Automation Triggers
`
    : ""
}

${
  plan.features?.webSurvey?.active
    ? `
#### Survey Features
- Web Surveys
- Customer Feedback Collection
- Survey Analytics
${googleReviewLine}
${emailNotificationLine}
${htmlEmbedLine}
`
    : ""
}

${
  plan.features?.loyalty?.active
    ? `
#### Loyalty Features
- Reward Programs
- Customer Rewards
- Referral Campaigns
- Gamified Loyalty
- WhatsApp Loyalty Automation
`
    : ""
}

${
  plan.features?.ticket?.active
    ? `
#### Support Features
- Shared Inbox
- Team Collaboration
- Ticketing System
- Multi-Agent Support
`
    : ""
}

`;
  })
  .join("\n")}

---

# RateUp Use Cases

## WhatsApp Marketing

Businesses use RateUp for:
- Broadcast campaigns
- Promotional messaging
- Customer engagement
- Lead nurturing
- Automated follow-ups

## Customer Support

Support teams use RateUp for:
- Omnichannel inbox management
- Shared team inbox
- Ticket assignment
- Internal collaboration
- AI-assisted support

## Customer Retention

Retention features include:
- Loyalty programs
- Reward systems
- Referral campaigns
- Automated engagement
- Customer feedback collection

## Survey & Feedback Management

RateUp supports:
- Web surveys
- Customer satisfaction tracking
- Review management
- Feedback automation
- Survey analytics

## API

https://api.rateup.app/api

## Documentation

https://docs.rateup.app

## Website

https://rateup.app
`.trim();
}
