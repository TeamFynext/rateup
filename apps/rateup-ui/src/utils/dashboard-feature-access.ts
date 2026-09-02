import { SubscriptionFeaturePathName, TeamFeature } from "@/types/enums.ts";

const DASHBOARD_LANDING_PRIORITY: Array<{ feature: TeamFeature; to: string }> = [
  { feature: TeamFeature.Inbox, to: "/dashboard/inbox?tab=open" },
  { feature: TeamFeature.Analytics, to: "/dashboard/analytics" },
  { feature: TeamFeature.Contacts, to: "/dashboard/contacts" },
  { feature: TeamFeature.Campaigns, to: "/dashboard/campaign" },
  { feature: TeamFeature.Loyalty, to: "/dashboard/loyalty/dashboard" },
  { feature: TeamFeature.Pipeline, to: "/dashboard/pipeline" },
];

const WHATSAPP_LANDING_PRIORITY: Array<{ feature: TeamFeature; to: string }> = [
  { feature: TeamFeature.Flows, to: "/dashboard/whatsapp/flows" },
  { feature: TeamFeature.Chatbots, to: "/dashboard/whatsapp/flowbots" },
  { feature: TeamFeature.Templates, to: "/dashboard/whatsapp/templates" },
  { feature: TeamFeature.Automation, to: "/dashboard/automation" },
];

const PROTECTED_ROUTE_FEATURE_MAP: Array<[string, TeamFeature]> = [
  ["/dashboard/inbox", TeamFeature.Inbox],
  ["/dashboard/analytics", TeamFeature.Analytics],
  ["/dashboard/contacts", TeamFeature.Contacts],
  ["/dashboard/campaign", TeamFeature.Campaigns],
  ["/dashboard/loyalty", TeamFeature.Loyalty],
  ["/dashboard/pipeline", TeamFeature.Pipeline],
  ["/dashboard/surveys", TeamFeature.WebForms],
  ["/dashboard/automation", TeamFeature.Automation],
  ["/dashboard/whatsapp/flows", TeamFeature.Flows],
  ["/dashboard/whatsapp/flowbots", TeamFeature.Chatbots],
  ["/dashboard/instagram/flowbots", TeamFeature.Chatbots],
  ["/dashboard/whatsapp/templates", TeamFeature.Templates],
  ["/dashboard/meta-agent", TeamFeature.AiChatbot],
  ["/dashboard/qrCreator", TeamFeature.QrStudio],
  ["/dashboard/apps&services", TeamFeature.AppsServices],
  ["/dashboard/settings/channels", TeamFeature.Automation],
  ["/dashboard/settings/integrations", TeamFeature.AppsServices],
];

export const DASHBOARD_NO_PERMISSION_FALLBACK = "/dashboard/settings";

export function getDashboardLandingTarget(allowedFeatures: ReadonlySet<string>): string {
  for (const item of DASHBOARD_LANDING_PRIORITY) {
    if (allowedFeatures.has(item.feature)) {
      return item.to;
    }
  }
  return DASHBOARD_NO_PERMISSION_FALLBACK;
}

export function getWhatsappLandingTarget(allowedFeatures: ReadonlySet<string>): string {
  for (const item of WHATSAPP_LANDING_PRIORITY) {
    if (allowedFeatures.has(item.feature)) {
      return item.to;
    }
  }

  return getDashboardLandingTarget(allowedFeatures);
}

export function getRequiredFeatureForDashboardPath(pathname: string): TeamFeature | undefined {
  return PROTECTED_ROUTE_FEATURE_MAP.find(([prefix]) => pathname.startsWith(prefix))?.[1];
}

/**
 * The subscription gate behind each dashboard route, mirroring `subscriptionGates` in
 * rateup-api/src/utils/canAccess.ts. That file is the source of truth and the server
 * still enforces every one of these — this copy only exists so the UI can say "not on
 * your plan" on arrival instead of rendering a broken page and waiting for a 403.
 *
 * Only routes whose gate can actually be closed are listed. The inbox, flows, templates
 * and automation all sit behind `whatsapp.active`, which is open on every tier including
 * Free, so gating them here would be noise.
 */
const PLAN_GATED_ROUTES: Array<[string, SubscriptionFeaturePathName, string]> = [
  ["/dashboard/campaign", SubscriptionFeaturePathName.WhatsappCampaign, "Campaigns"],
  ["/dashboard/loyalty", SubscriptionFeaturePathName.WhatsappLoyalty, "Loyalty"],
  ["/dashboard/commerce", SubscriptionFeaturePathName.WhatsappCatalog, "Commerce"],
  ["/dashboard/surveys", SubscriptionFeaturePathName.WebSurvey, "Surveys"],
  ["/dashboard/meta-agent", SubscriptionFeaturePathName.AI, "The Meta Business Agent"],
];

export interface PlanGatedRoute {
  gate: SubscriptionFeaturePathName;
  /** Human name for the heading — "Campaigns is not part of your plan". */
  label: string;
}

/** The plan gate this path sits behind, if any. */
export function getPlanGateForDashboardPath(pathname: string): PlanGatedRoute | undefined {
  const match = PLAN_GATED_ROUTES.find(([prefix]) => pathname.startsWith(prefix));
  return match ? { gate: match[1], label: match[2] } : undefined;
}
