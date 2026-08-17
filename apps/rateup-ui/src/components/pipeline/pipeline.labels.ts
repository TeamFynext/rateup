// Translated labels for the pipeline's fixed vocabularies.
//
// These live apart from `pipeline.constants.tsx` because the constants are
// module-scope objects and `t` only exists inside a component. Each lookup is a
// switch over literal `t("…")` calls rather than a translated map, for two
// reasons: `npx i18next-cli extract` only sees literal arguments, so a map keyed
// by a variable would never register its keys; and a plain function works in
// `buildPipelineNavItems`, which builds sidebar data outside any component.
//
// Org-authored names — stage, lifecycle and label names, lost reasons, team and
// pipeline names — are data, not UI copy, and are deliberately absent here.

import type { TFunction } from "i18next";

import type { LeadChannel, LeadSource, LeadTaskType } from "@/backend/pipeline/pipeline.types.ts";
import type { LeadFilter, PipelineView } from "@/store/pipeline.store.ts";

/** How the lead reached the board. */
export function sourceLabel(t: TFunction, source: LeadSource): string {
  switch (source) {
    case "WHATSAPP":
      return t("WhatsApp enquiry");
    case "INSTAGRAM":
      return t("Instagram DM");
    case "MESSENGER":
      return t("Messenger");
    case "SURVEY":
      return t("Web survey");
    case "REFERRAL":
      return t("Referral program");
    case "LOYALTY":
      return t("Loyalty program");
    case "MANUAL":
      return t("Added manually");
  }
}

/** The messaging channel the lead is reachable on. */
export function channelLabel(t: TFunction, channel: LeadChannel): string {
  switch (channel) {
    case "WHATSAPP":
      return t("WhatsApp");
    case "INSTAGRAM":
      return t("Instagram");
    case "MESSENGER":
      return t("Messenger");
    case "NONE":
      return t("None");
  }
}

export function taskTypeLabel(t: TFunction, type: LeadTaskType): string {
  switch (type) {
    case "CALL":
      return t("Call");
    case "MESSAGE":
      return t("Message");
    case "MEETING":
      return t("Meeting");
    case "DOCUMENT":
      return t("Document");
    case "TODO":
      return t("To-do");
  }
}

export function viewTabLabel(t: TFunction, view: PipelineView): string {
  switch (view) {
    case "board":
      return t("Board");
    case "list":
      return t("List");
    case "forecast":
      return t("Forecast");
    case "insights":
      return t("Insights");
    case "settings":
      return t("Settings");
  }
}

/** The sidebar's saved-view rows. */
export function leadFilterLabel(t: TFunction, filter: LeadFilter): string {
  switch (filter) {
    case "open":
      return t("All leads on board");
    case "mine":
      return t("Mine");
    case "rotting":
      return t("Needs attention");
    case "noactivity":
      return t("No next activity");
    case "won":
      return t("Won");
    case "lost":
      return t("Lost");
  }
}
