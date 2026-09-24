import { z } from "zod";

export const ORG_TABS = ["overview", "members", "billing", "usage", "activity", "danger"] as const;
export type OrgTab = (typeof ORG_TABS)[number];

export const ORG_TAB_LABELS: Record<OrgTab, string> = {
  overview: "Overview",
  members: "Members & roles",
  billing: "Plan & billing",
  usage: "Usage",
  activity: "Activity",
  danger: "Danger zone",
};

/** Tabs that were folded into others; old links land where their content now lives. */
const MOVED_TABS: Record<string, OrgTab> = { messages: "usage", channels: "overview" };

export const orgTabSchema = z.preprocess(
  (value) => (typeof value === "string" && value in MOVED_TABS ? MOVED_TABS[value] : value),
  z.enum(ORG_TABS).optional().catch(undefined),
);
