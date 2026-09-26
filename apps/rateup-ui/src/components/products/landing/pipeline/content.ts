/* Copy for the Pipeline landing page. Everything here describes something the dashboard's
   Pipeline really does — check `components/pipeline` and `rateup-api/src/modules/pipeline`
   before adding a claim. Leads carry no deal value, so nothing here may count money. */

import type { ProductFaqItem } from "../shared/ProductFaq";

export const PIPELINE_DESCRIPTION =
  "RateUp Pipeline turns WhatsApp, Instagram and Messenger conversations into leads on a drag-and-drop board. Each stage has a win probability and a stale-lead threshold, every lead has an owner, notes, tasks and a full history, and the Leads board is wired to the inbox, automations and CRM syncs.";

/** Feeds the JSON-LD `featureList` and the Markdown twin. */
export const PIPELINE_FEATURES = [
  "Drag-and-drop Leads board with Board and List views",
  "Add a contact to the pipeline from the inbox side panel",
  "Stages with win probability and a stale-lead threshold",
  "Lead owner, several assignees, team, labels and expected close date",
  "Notes, activity history and tasks (call, message, meeting, document, to-do)",
  "Close as Won or Lost with a lost reason, and reopen",
  "Saved views: Mine, Needs attention, No next activity, Won, Lost",
  "Insights: funnel by stage, time in stage, leads by source, team and assignee",
  "Forecast of expected wins by close month, weighted by stage probability",
  "CSV and Excel import (1,000 rows per upload) and export",
  "Automations on stage changes, Zoho Bigin and GetLead sync, Zapier and Meta Conversions API",
  "Support, Projects and Custom boards alongside the Leads board",
] as const;

export const PIPELINE_FAQS: readonly ProductFaqItem[] = [
  {
    question: "How does a conversation become a lead?",
    answer:
      "From the inbox. The side panel of every conversation has a lead stage picker — choose a stage and the contact lands on your Leads board, or moves along it if they're already there. You can also stage many contacts at once from the Contacts table, add a lead by hand, import a spreadsheet, or let an automation rule do it.",
  },
  {
    question: "Can I track deal value or revenue?",
    answer:
      "Not today. Leads don't carry an amount. Each stage has a win probability, and the Forecast tab uses it to show how many open leads you can expect to win in each close month — a count of leads, not a revenue figure.",
  },
  {
    question: "What does “Needs attention” mean?",
    answer:
      "Every stage has a number of days a lead may sit without activity. Past that, the card is outlined and shows how long it has been idle, and it appears in the Needs attention view. Moving the lead, adding a note or completing a task counts as activity and clears it.",
  },
  {
    question: "Can I run more than one pipeline?",
    answer:
      "Yes. Every workspace has one Leads board — the one the inbox, automations and CRM syncs work with — and up to ten more boards for support, projects or anything else, each starting from its own set of columns that you can rename, recolour and reorder.",
  },
  {
    question: "Does it sync with our CRM?",
    answer:
      "Map your board's stages to Zoho Bigin's and every move updates the deal there; Zoho CRM keeps contacts in sync, and GetLead syncs lead status both ways. Zapier gets a trigger whenever a contact's stage changes, and a won lead can send an event to Meta's Conversions API so your ads learn which conversations turned into customers.",
  },
  {
    question: "Who can delete a lead?",
    answer:
      "Only workspace owners and admins. Everyone else closes a lead as Lost with a reason, so the history of what happened stays on the board.",
  },
  {
    question: "Can I bring my existing leads?",
    answer:
      "Yes. Download the template, fill it in and upload up to 1,000 rows at a time as CSV or Excel — name, phone, email, company, stage, source, assignee, expected close date and a note. Export works the same way, so a file can round-trip.",
  },
];

export const PROBLEMS = [
  {
    title: "Leads buried in chat",
    body: "The enquiry came in on WhatsApp on Tuesday. By Friday it's forty conversations down, and nobody remembers who was meant to call back.",
    icon: "buried",
  },
  {
    title: "No next step",
    body: "A chat can't tell you what happens next. Without a task and an owner, a warm lead goes cold one quiet day at a time.",
    icon: "next",
  },
  {
    title: "A spreadsheet nobody trusts",
    body: "Someone copies names into a sheet at the end of the week. It's out of date by Monday, and it never says which chat a lead came from.",
    icon: "sheet",
  },
] as const;

export const FLOW_STEPS = [
  {
    title: "Conversation arrives",
    body: "WhatsApp, Instagram or Messenger, into the shared inbox.",
  },
  {
    title: "Stage picked in the inbox",
    body: "The agent sets a lead stage from the side panel — the contact joins the Leads board.",
  },
  {
    title: "Owner and next task",
    body: "Assign an owner and teammates, then schedule a call, message or meeting.",
  },
  {
    title: "Dragged to Won or Lost",
    body: "Closing asks for a lost reason, and the whole history stays on the lead.",
  },
] as const;

/* Illustrative figures for the insights mock. Counts and durations only — a conversion
   percentage here would read as a promise. */
export const INSIGHT_TILES = [
  { value: "148", label: "Leads in the pipeline" },
  { value: "9", label: "Need attention" },
  { value: "11 days", label: "Average time to win" },
] as const;

export const FUNNEL = [
  { stage: "New Lead", count: 52, width: "w-full", tone: "bg-ru-green-600" },
  { stage: "Contacted", count: 38, width: "w-[73%]", tone: "bg-ru-green-500" },
  { stage: "Qualified", count: 27, width: "w-[52%]", tone: "bg-ru-amber-400" },
  { stage: "Demo / Proposal", count: 19, width: "w-[37%]", tone: "bg-ru-amber-500" },
  { stage: "Negotiation", count: 12, width: "w-[23%]", tone: "bg-ru-amber-600" },
] as const;

export const FORECAST = [
  { month: "Oct", wins: 14, height: "h-[78%]" },
  { month: "Nov", wins: 11, height: "h-[61%]" },
  { month: "Dec", wins: 6, height: "h-[33%]" },
] as const;

export const SOURCES = [
  { source: "WhatsApp enquiry", count: 81 },
  { source: "Instagram DM", count: 34 },
  { source: "Referral program", count: 19 },
  { source: "Added manually", count: 14 },
] as const;
