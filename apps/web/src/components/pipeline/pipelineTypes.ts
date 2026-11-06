import {
  IconFilterBolt,
  IconHeadset,
  IconLayoutKanban,
  IconListCheck,
  type Icon,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { PipelineSummary, PipelineType } from "@/backend/pipeline/pipeline.types.ts";

/** Boards of any type other than Leads an org may have; mirrors `OTHER_PIPELINE_LIMIT` in rateup-api. */
export const OTHER_PIPELINE_LIMIT = 10;

export const PIPELINE_TYPE_ORDER: readonly PipelineType[] = [
  "LEADS",
  "SUPPORT",
  "PROJECTS",
  "CUSTOM",
];

/** The sales-funnel parts of the board. Only the Leads type has them. */
export interface PipelineTypeFeatures {
  forecast: boolean;
  probability: boolean;
  lostReasons: boolean;
  company: boolean;
  source: boolean;
  conversionsApi: boolean;
}

export interface PipelineTypeConfig {
  type: PipelineType;
  icon: Icon;
  label: string;
  /** One line for the create dialog: what the board is for. */
  description: string;
  /** The columns the API seeds, as the create dialog describes them. */
  seedSummary: string;
  /** A card on this board, e.g. "Add lead" / "Add ticket". */
  addCard: string;
  /**
   * Leads cards are a customer; every other board's are a piece of work, so the
   * create dialog leads with a title and makes the contact optional.
   */
  cardIsCustomer: boolean;
  /** Whether the create dialog opens with its optional contact section expanded. */
  contactOpenByDefault: boolean;
  titlePlaceholder: string;
  /** The list view's first column heading. */
  cardHeading: string;
  searchPlaceholder: string;
  /** The header badge: "{open} open · {total} leads". */
  counts: (open: number, total: number) => string;
  /** A bare count of cards: "{total} leads". */
  cardTotal: (total: number) => string;
  wonLabel: string;
  lostLabel: string;
  markWon: string;
  markLost: string;
  features: PipelineTypeFeatures;
}

const NO_SALES: PipelineTypeFeatures = {
  forecast: false,
  probability: false,
  lostReasons: false,
  company: false,
  source: false,
  conversionsApi: false,
};

/**
 * Everything a board's wording and chrome take from its type, in one place. The seeds
 * mirror `PIPELINE_TYPE_SEEDS` in rateup-api; the translation extractor only sees literal
 * `t("…")` calls, so every label is written out here rather than built from a noun.
 */
export function pipelineTypeConfig(t: TFunction, type: PipelineType): PipelineTypeConfig {
  switch (type) {
    case "SUPPORT":
      return {
        type,
        icon: IconHeadset,
        label: t("Support"),
        description: t("Service requests, repairs and complaints, from new to resolved."),
        seedSummary: t("Starts with New, In progress, Waiting on customer, Resolved and Closed."),
        addCard: t("Add ticket"),
        cardIsCustomer: false,
        contactOpenByDefault: true,
        titlePlaceholder: t("e.g. Order arrived damaged"),
        cardHeading: t("Ticket"),
        searchPlaceholder: t("Search tickets"),
        counts: (open, total) => t("{open} open · {total} tickets", { open, total }),
        cardTotal: (total) => t("{total} tickets", { total }),
        wonLabel: t("Resolved"),
        lostLabel: t("Closed"),
        markWon: t("Mark as resolved"),
        markLost: t("Mark as closed"),
        features: NO_SALES,
      };
    case "PROJECTS":
      return {
        type,
        icon: IconListCheck,
        label: t("Projects"),
        description: t("Client onboarding and project work, with tasks and due dates."),
        seedSummary: t("Starts with To do, In progress, Review, Done and Cancelled."),
        addCard: t("Add task"),
        cardIsCustomer: false,
        contactOpenByDefault: false,
        titlePlaceholder: t("e.g. Set up the new menu"),
        cardHeading: t("Task"),
        searchPlaceholder: t("Search tasks"),
        counts: (open, total) => t("{open} open · {total} tasks", { open, total }),
        cardTotal: (total) => t("{total} tasks", { total }),
        wonLabel: t("Done"),
        lostLabel: t("Cancelled"),
        markWon: t("Mark as done"),
        markLost: t("Mark as cancelled"),
        features: NO_SALES,
      };
    case "CUSTOM":
      return {
        type,
        icon: IconLayoutKanban,
        label: t("Custom"),
        description: t("A blank board for anything else. Name the columns yourself."),
        seedSummary: t("Starts with To do, Doing and Done."),
        addCard: t("Add card"),
        cardIsCustomer: false,
        contactOpenByDefault: false,
        titlePlaceholder: t("e.g. Plan the launch event"),
        cardHeading: t("Card"),
        searchPlaceholder: t("Search cards"),
        counts: (open, total) => t("{open} open · {total} cards", { open, total }),
        cardTotal: (total) => t("{total} cards", { total }),
        wonLabel: t("Done"),
        lostLabel: t("Cancelled"),
        markWon: t("Mark as done"),
        markLost: t("Mark as cancelled"),
        features: NO_SALES,
      };
    default:
      return {
        type: "LEADS",
        icon: IconFilterBolt,
        label: t("Leads"),
        description: t(
          "Your sales funnel. The inbox, automations and CRM integrations use this board.",
        ),
        seedSummary: t(
          "Starts with a standard funnel — New Lead through to Won and Lost. Rename the columns, or change what each one does, afterwards in pipeline settings.",
        ),
        addCard: t("Add lead"),
        cardIsCustomer: true,
        contactOpenByDefault: true,
        titlePlaceholder: t("Name"),
        cardHeading: t("Lead"),
        searchPlaceholder: t("Search leads"),
        counts: (open, total) => t("{open} open · {total} leads", { open, total }),
        cardTotal: (total) => t("{total} leads", { total }),
        wonLabel: t("Won"),
        lostLabel: t("Lost"),
        markWon: t("Mark as won"),
        markLost: t("Mark as lost"),
        features: {
          forecast: true,
          probability: true,
          lostReasons: true,
          company: true,
          source: true,
          conversionsApi: true,
        },
      };
  }
}

/** The org's one Leads board — the board the inbox, automations and integrations read. */
export function findLeadsPipeline<T extends Pick<PipelineSummary, "type">>(
  pipelines: readonly T[] | undefined,
): T | undefined {
  return pipelines?.find((pipeline) => pipeline.type === "LEADS");
}

/** The board's type config; a board still loading reads as Leads, the only type before types. */
export function usePipelineTypeConfig(pipeline: Pick<PipelineSummary, "type"> | undefined) {
  const { t } = useTranslation();
  return pipelineTypeConfig(t, pipeline?.type ?? "LEADS");
}
