/**
 * Copy and data for `/integrations/hubspot`.
 *
 * As on the store pages, the FAQ lives apart from the markup because the route builds the
 * `FAQPage` JSON-LD from the same array the accordion renders. Every claim here is something the
 * integration does today: contacts both ways, Leads board leads as deals with stage mapping both
 * ways, notes for closed conversations and survey responses, and a first-time sync. Phone matching
 * needs the number with its country code, and deleting a record on one side leaves the other.
 */

export interface HubSpotFaq {
  question: string;
  answer: string;
}

export const HUBSPOT_FAQS: readonly HubSpotFaq[] = [
  {
    question: "How do I connect HubSpot to RateUp?",
    answer:
      "In RateUp, open Settings › Integrations › HubSpot and choose Connect. You sign in to HubSpot and pick the account; RateUp asks for access to contacts and deals only. One HubSpot account connects to one RateUp workspace, and every sync is off until you switch it on.",
  },
  {
    question: "Do contacts sync both ways?",
    answer:
      "Yes, once Send contacts to HubSpot is on. New and edited RateUp contacts with an email or phone number go to HubSpot, and edits made in HubSpot come back. Someone HubSpot already has is matched by email, then by phone, and linked rather than duplicated. Contacts created in HubSpot can be added to RateUp too, behind their own switch.",
  },
  {
    question: "How do RateUp leads become HubSpot deals?",
    answer:
      "Pick a HubSpot deal pipeline and map each column of your Leads board to one of its stages. A lead arriving on the board, or moving to a mapped column, becomes a deal on the lead's contact in the mapped stage. Moving the deal in HubSpot moves the lead in RateUp, and a change is never bounced back to where it came from.",
  },
  {
    question: "Can WhatsApp conversations be logged in HubSpot?",
    answer:
      "Yes. With Log closed conversations on, closing a conversation adds a note to the person's HubSpot contact: who closed it, why, the resolution, and its last 50 messages. Survey responses can be logged the same way, question by question; answers stored encrypted stay in RateUp.",
  },
  {
    question: "What about contacts from before I connected?",
    answer:
      "The first-time sync covers them, in both directions. Import contacts from HubSpot adds HubSpot contacts that have a phone number with its country code, and Send existing contacts to HubSpot links or creates your RateUp contacts there, with Leads board leads sent as deals when deals are on. Nothing already linked is changed.",
  },
  {
    question: "What happens when a record is deleted?",
    answer:
      "Deleting a contact or deal on one side leaves the other as it is; only the link between them goes. RateUp never deletes records in your HubSpot account.",
  },
];

/** What syncs, and in which direction. */
export const HUBSPOT_SYNC_ROWS: readonly (readonly [string, string, string])[] = [
  ["Contacts", "Both ways", "Name, email and phone; matched by email, then phone"],
  [
    "Leads board leads",
    "Both ways",
    "As deals in one pipeline, stage by stage through your mapping",
  ],
  ["New HubSpot contacts", "HubSpot → RateUp", "Optional; needs a phone number with country code"],
  ["New HubSpot deals", "HubSpot → RateUp", "Optional; opened as leads in the mapped column"],
  ["Closed conversations", "RateUp → HubSpot", "A note on the contact, with the last 50 messages"],
  ["Survey responses", "RateUp → HubSpot", "A note on the contact, question by question"],
];

export const HUBSPOT_SETUP_STEPS = [
  {
    n: "1",
    title: "Connect your account",
    body: "In Settings › Integrations › HubSpot, sign in to HubSpot and choose the account. Nothing syncs yet.",
  },
  {
    n: "2",
    title: "Choose what syncs",
    body: "Switch on contacts, deals and activity notes, pick a deal pipeline and map your Leads board columns to its stages.",
  },
  {
    n: "3",
    title: "Bring over what you have",
    body: "Run the first-time sync to link the contacts and leads you already have. From then on, changes flow as they happen.",
  },
] as const;

export const HUBSPOT_FEATURES = [
  {
    title: "No ping-pong",
    body: "A change that came from HubSpot is not sent back to it, and RateUp's own updates coming back through HubSpot are recognised and skipped.",
  },
  {
    title: "No duplicates",
    body: "People are matched by email, then phone, before anything is created, on the first-time sync as much as day to day.",
  },
  {
    title: "Your conversations in the CRM",
    body: "Closed WhatsApp conversations and survey responses land on the contact's HubSpot timeline for the rest of your team.",
  },
  {
    title: "Everything off by default",
    body: "Each sync has its own switch, so you decide what reaches HubSpot and what comes back.",
  },
] as const;
