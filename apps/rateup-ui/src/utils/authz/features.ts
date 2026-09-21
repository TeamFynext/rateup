import { TeamFeature } from "@/types/enums.ts";

import type { Permission } from "./permissions.ts";

/**
 * The module each sidebar section and route belongs to, expressed as the permission that
 * opens it. Modules with `null` are open to every member (no permission gates them).
 *
 * Team feature grants used to decide this per team; roles decide it now, and this map is
 * what lets the navigation and the route guard keep asking "may they see this module".
 */
export const FEATURE_PERMISSION: Record<TeamFeature, Permission | null> = {
  [TeamFeature.Inbox]: "inbox.read",
  [TeamFeature.Analytics]: "analytics.read",
  [TeamFeature.Contacts]: "contacts.read",
  [TeamFeature.Campaigns]: "campaigns.read",
  [TeamFeature.Flows]: "flows.read",
  [TeamFeature.Chatbots]: "chatbots.read",
  [TeamFeature.Templates]: "templates.read",
  [TeamFeature.Automation]: "automation.read",
  [TeamFeature.Loyalty]: "loyalty.read",
  [TeamFeature.WebForms]: "surveys.read",
  [TeamFeature.Tickets]: null,
  [TeamFeature.Pipeline]: "pipelines.read",
  [TeamFeature.QrStudio]: null,
  [TeamFeature.AiChatbot]: "meta_agent.read",
  [TeamFeature.AppsServices]: "integrations.read",
  [TeamFeature.Settings]: null,
};

/** The modules a permission set opens, in the shape the navigation and guard already read. */
export function allowedFeaturesFromPermissions(permissions: ReadonlySet<string>): Set<TeamFeature> {
  const features = new Set<TeamFeature>();
  for (const feature of Object.values(TeamFeature)) {
    const permission = FEATURE_PERMISSION[feature];
    if (permission === null || permissions.has(permission)) features.add(feature);
  }
  return features;
}
