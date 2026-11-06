import type { PipelineType } from "../../../generated/prisma/client.js";

interface SeedStage {
  name: string;
  short: string;
  probability: number;
  rottingDays: number;
  status: "OPEN" | "WON" | "LOST";
  color: string;
}

/**
 * The Leads board is the org's one sales funnel: the inbox, automations, CRM syncs and the
 * Conversions API all read it. Every other type is a working board of its own and none of
 * those side effects fire for it. The UI's `pipelineTypes.ts` mirrors these seeds.
 */
export const LEADS_PIPELINE_TYPE = "LEADS" satisfies PipelineType;

/** Boards of any type other than Leads an org may have. */
export const OTHER_PIPELINE_LIMIT = 10;

/**
 * The columns each type starts with. A board is the org's own, so these are a starting point
 * rather than a rule; every field is editable in pipeline settings. Won and Lost are ordinary
 * columns carrying a closing status, which is what lets a card be dragged into either one.
 */
export const PIPELINE_TYPE_SEEDS: Record<
  PipelineType,
  { stages: readonly SeedStage[]; lostReasons: readonly string[] }
> = {
  LEADS: {
    stages: [
      {
        name: "New Lead",
        short: "New",
        probability: 10,
        rottingDays: 3,
        status: "OPEN",
        color: "#16A34A",
      },
      {
        name: "Contacted",
        short: "Contacted",
        probability: 25,
        rottingDays: 4,
        status: "OPEN",
        color: "#3FA46A",
      },
      {
        name: "Qualified",
        short: "Qualified",
        probability: 45,
        rottingDays: 5,
        status: "OPEN",
        color: "#FFB638",
      },
      {
        name: "Demo / Proposal",
        short: "Proposal",
        probability: 65,
        rottingDays: 7,
        status: "OPEN",
        color: "#F8951D",
      },
      {
        name: "Negotiation",
        short: "Negotiation",
        probability: 80,
        rottingDays: 5,
        status: "OPEN",
        color: "#D97A0F",
      },
      {
        name: "Won",
        short: "Won",
        probability: 100,
        rottingDays: 0,
        status: "WON",
        color: "#1C518E",
      },
      {
        name: "Lost",
        short: "Lost",
        probability: 0,
        rottingDays: 0,
        status: "LOST",
        color: "#666864",
      },
    ],
    lostReasons: [
      "Price too high",
      "No response",
      "Chose a competitor",
      "Not the right fit",
      "Timing — revisit later",
    ],
  },
  SUPPORT: {
    stages: [
      {
        name: "New",
        short: "New",
        probability: 0,
        rottingDays: 1,
        status: "OPEN",
        color: "#16A34A",
      },
      {
        name: "In progress",
        short: "In progress",
        probability: 0,
        rottingDays: 2,
        status: "OPEN",
        color: "#F8951D",
      },
      {
        name: "Waiting on customer",
        short: "Waiting",
        probability: 0,
        rottingDays: 3,
        status: "OPEN",
        color: "#FFB638",
      },
      {
        name: "Resolved",
        short: "Resolved",
        probability: 0,
        rottingDays: 0,
        status: "WON",
        color: "#1C518E",
      },
      {
        name: "Closed",
        short: "Closed",
        probability: 0,
        rottingDays: 0,
        status: "LOST",
        color: "#666864",
      },
    ],
    lostReasons: [],
  },
  PROJECTS: {
    stages: [
      {
        name: "To do",
        short: "To do",
        probability: 0,
        rottingDays: 7,
        status: "OPEN",
        color: "#16A34A",
      },
      {
        name: "In progress",
        short: "In progress",
        probability: 0,
        rottingDays: 7,
        status: "OPEN",
        color: "#F8951D",
      },
      {
        name: "Review",
        short: "Review",
        probability: 0,
        rottingDays: 3,
        status: "OPEN",
        color: "#FFB638",
      },
      {
        name: "Done",
        short: "Done",
        probability: 0,
        rottingDays: 0,
        status: "WON",
        color: "#1C518E",
      },
      {
        name: "Cancelled",
        short: "Cancelled",
        probability: 0,
        rottingDays: 0,
        status: "LOST",
        color: "#666864",
      },
    ],
    lostReasons: [],
  },
  CUSTOM: {
    stages: [
      {
        name: "To do",
        short: "To do",
        probability: 0,
        rottingDays: 7,
        status: "OPEN",
        color: "#16A34A",
      },
      {
        name: "Doing",
        short: "Doing",
        probability: 0,
        rottingDays: 7,
        status: "OPEN",
        color: "#F8951D",
      },
      {
        name: "Done",
        short: "Done",
        probability: 0,
        rottingDays: 0,
        status: "WON",
        color: "#1C518E",
      },
    ],
    lostReasons: [],
  },
};
