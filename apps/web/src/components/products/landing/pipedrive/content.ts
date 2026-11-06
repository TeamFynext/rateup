import type { CrmFaq, CrmIntegrationContent } from "../crm/CrmIntegrationPage";

/**
 * Copy and data for `/integrations/pipedrive`.
 *
 * The FAQ lives apart from the markup because the route builds the `FAQPage` JSON-LD from the
 * same array the accordion renders. Every claim here is something the integration does today:
 * contacts and persons both ways, Leads board leads as deals both ways (Won and Lost columns as
 * the deal's status), notes for closed conversations and survey responses, and a first-time sync.
 * Phone matching needs the number with its country code, and deleting a record on one side leaves
 * the other.
 */

export const PIPEDRIVE_FAQS: readonly CrmFaq[] = [
  {
    question: "How do I connect Pipedrive to RateUp?",
    answer:
      "In RateUp, open Settings › Integrations › Pipedrive and choose Connect. You sign in to Pipedrive and approve RateUp for your company. One Pipedrive company connects to one RateUp workspace, and every sync is off until you switch it on.",
  },
  {
    question: "Do contacts sync both ways?",
    answer:
      "Yes, once Send contacts to Pipedrive is on. New and edited RateUp contacts with an email or phone number become Pipedrive persons, and edits made in Pipedrive come back. Someone Pipedrive already has is matched by email, then by phone, and linked rather than duplicated. Persons created in Pipedrive can be added to RateUp too, behind their own switch.",
  },
  {
    question: "How do RateUp leads become Pipedrive deals?",
    answer:
      "Pick a Pipedrive pipeline and map each open column of your Leads board to one of its stages. A lead arriving on the board, or moving to a mapped column, becomes a deal on the lead's person in the mapped stage. Won and Lost columns mark the deal won or lost, with the lost reason. Moving the deal in Pipedrive, or winning or losing it there, moves the lead in RateUp.",
  },
  {
    question: "Can WhatsApp conversations be logged in Pipedrive?",
    answer:
      "Yes. With Log closed conversations on, closing a conversation adds a note to the person in Pipedrive: who closed it, why, the resolution, and its last 50 messages. Survey responses can be logged the same way, question by question; answers stored encrypted stay in RateUp.",
  },
  {
    question: "What about contacts from before I connected?",
    answer:
      "The first-time sync covers them, in both directions. Import persons from Pipedrive adds persons that have a phone number with its country code, and Send existing contacts to Pipedrive links or creates your RateUp contacts there, with Leads board leads sent as deals when deals are on. Nothing already linked is changed.",
  },
  {
    question: "What happens when a record is deleted?",
    answer:
      "Deleting a contact or deal on one side leaves the other as it is; only the link between them goes. RateUp never deletes records in your Pipedrive company.",
  },
];

export const PIPEDRIVE_CONTENT: CrmIntegrationContent = {
  crm: "Pipedrive",
  heroTitle: "Your WhatsApp contacts, leads and conversations in Pipedrive",
  heroBody:
    "Keep contacts and persons in step both ways, turn Leads board leads into Pipedrive deals that move, win and lose with them, and log closed conversations and survey responses on the person.",
  heroBadges: ["Connect in two clicks", "Two-way sync", "Won and lost, both ways"],
  timeline: {
    label: "Pipedrive · Person notes",
    title: "WhatsApp conversation #1042 closed",
    meta: "Closed by Sam · Resolved · 6 messages",
    lines: [
      "Customer: Is the bulk order on track?",
      "Sam: Yes, it ships tomorrow. You will get the tracking link here.",
    ],
    chips: ["Deal: Proposal made", "Lead: In talks"],
  },
  setupSteps: [
    {
      n: "1",
      title: "Connect your company",
      body: "In Settings › Integrations › Pipedrive, sign in to Pipedrive and approve RateUp. Nothing syncs yet.",
    },
    {
      n: "2",
      title: "Choose what syncs",
      body: "Switch on contacts, deals and activity notes, pick a pipeline and map your open Leads board columns to its stages.",
    },
    {
      n: "3",
      title: "Bring over what you have",
      body: "Run the first-time sync to link the contacts and leads you already have. From then on, changes flow as they happen.",
    },
  ],
  uninstall:
    "To remove RateUp's access from Pipedrive's side, uninstall it under Tools and apps › Marketplace apps in Pipedrive.",
  syncRows: [
    ["Contacts", "Both ways", "As persons: name, email and phone; matched by email, then phone"],
    [
      "Leads board leads",
      "Both ways",
      "As deals in one pipeline, stage by stage through your mapping",
    ],
    ["Won and Lost", "Both ways", "The deal's status, with the lost reason"],
    [
      "New Pipedrive persons",
      "Pipedrive → RateUp",
      "Optional; needs a phone number with country code",
    ],
    ["New Pipedrive deals", "Pipedrive → RateUp", "Optional; opened as leads in the mapped column"],
    [
      "Closed conversations",
      "RateUp → Pipedrive",
      "A note on the person, with the last 50 messages",
    ],
    ["Survey responses", "RateUp → Pipedrive", "A note on the person, question by question"],
  ],
  features: [
    {
      title: "No ping-pong",
      body: "A change that came from Pipedrive is not sent back to it, and RateUp's own updates coming back through Pipedrive are recognised and skipped.",
    },
    {
      title: "No duplicates",
      body: "People are matched by email, then phone, before anything is created, on the first-time sync as much as day to day.",
    },
    {
      title: "Your conversations in the CRM",
      body: "Closed WhatsApp conversations and survey responses land as notes on the person, for the rest of your sales team.",
    },
    {
      title: "Everything off by default",
      body: "Each sync has its own switch, so you decide what reaches Pipedrive and what comes back.",
    },
  ],
  faqs: PIPEDRIVE_FAQS,
  closing: "Connect Pipedrive to your WhatsApp inbox.",
};
