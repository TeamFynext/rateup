import type { RateupPaymentPlan } from "@/backend/payment/payment.api";
import {
  buildTiers,
  formatCount,
  isUnlimitedCount,
  limitAnswer,
  resolvePack,
} from "@/components/HomePage/pages/Pricing/pricing.data.ts";

// src/routes/(marketing)/_markdown/pricing.ts

function formatPrice(amount?: string | number, currency?: string, period?: string) {
  const value = Number(amount);
  if (!value) return "Custom Pricing";

  return `${currency || "INR"} ${(value / 100).toLocaleString()} / ${period || "plan"}`;
}

/** Enterprise meters are sized per contract, so the sentinel reads "Custom". */
function meterCount(value: number | undefined) {
  return isUnlimitedCount(value) ? "Custom" : formatCount(value ?? 0);
}

function getPlanHighlights(plan: RateupPaymentPlan) {
  const features = plan.features || {};

  return [
    features.team?.active ? `${features.team?.count?.max || 0} Teams` : null,
    features.team?.teamMember?.active
      ? `${features.team?.teamMember?.count?.max || 0} Users`
      : null,
    features.whatsapp?.active
      ? `${meterCount(features.whatsapp?.activeContacts?.count?.max)} active contacts / month`
      : null,
    features.whatsapp?.active
      ? `${meterCount(features.whatsapp?.campaignCredits?.count?.max)} campaign messages / month`
      : null,
    features.whatsapp?.automation?.active
      ? `${features.whatsapp?.automation?.automationTrigger?.count?.max || 0} Automation Triggers`
      : null,
    features.whatsapp?.campaign?.active
      ? `${features.whatsapp?.campaign?.count?.max || 0} WhatsApp Campaigns`
      : null,
    features.webSurvey?.active
      ? `Web Surveys (${features.webSurvey?.count?.monthlyResponseLimit || 0} monthly responses)`
      : null,
    features.loyalty?.active ? "WhatsApp Loyalty Program" : null,
    features.ai?.active ? "Meta Business AI agent (billed by Meta)" : null,
  ].filter(Boolean);
}

export function buildPricingMarkdown(plans: RateupPaymentPlan[]) {
  // Only the sold tiers, in ladder order; the catalog also holds legacy rows and packs.
  const tierNames = new Set(buildTiers(plans).map((tier) => tier.planName));
  const tiers = plans.filter((plan) => tierNames.has(plan.name));
  const packs = {
    contacts: resolvePack(plans, "contacts"),
    credits: resolvePack(plans, "credits"),
  };

  return `
# RateUp Pricing

## How RateUp pricing works

- **0% markup on Meta fees.** Meta bills WhatsApp message fees and the Meta Business AI agent directly to your own Meta Business account. RateUp adds nothing on top.
- **Pay only for the contacts you talk to.** Plans are sized by monthly active contacts: anyone who messages you, or whom you message one to one (inbox, automations, flows, loyalty, API), in a calendar month. Each contact counts once a month. Contacts who only receive broadcasts are free.
- **Campaign credits.** One credit is one campaign message to one recipient, drip stages included. Each plan includes a monthly credit allowance.
- **When you hit a limit.** ${limitAnswer(packs)}

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
- Customer Loyalty Programs
- Surveys & Feedback Collection
- Broadcast Campaigns
- Drip Campaigns
- Workflow Automation
- Analytics Dashboard
- Reputation Management
- Multi-Agent Collaboration

## Available Pricing Plans

${tiers
  .map((plan) => {
    const payment = plan.paymentPlan;
    const description = Array.isArray(plan.description)
      ? plan.description.map((item: string) => `- ${item}`).join("\n")
      : "- Customer engagement tools";
    const googleReviewLine = plan.features?.webSurvey?.googleReview?.active
      ? "- Google Review Integration"
      : "";
    const emailNotificationLine = plan.features?.webSurvey?.emailNotification?.active
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

${`
#### Support Features
- Shared Inbox
- Team Collaboration
- Multi-Agent Support
`}

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
