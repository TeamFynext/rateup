import { SubscriptionFeaturePathName, TeamFeature } from "@/types/enums.ts";
import { getModuleForDashboardPath } from "@/utils/modules.ts";

const DASHBOARD_LANDING_PRIORITY: Array<{ feature: TeamFeature; to: string }> = [
  { feature: TeamFeature.Inbox, to: "/dashboard/inbox?tab=open" },
  { feature: TeamFeature.Analytics, to: "/dashboard/analytics" },
  { feature: TeamFeature.Contacts, to: "/dashboard/contacts" },
  { feature: TeamFeature.Campaigns, to: "/dashboard/campaigns" },
  { feature: TeamFeature.Loyalty, to: "/dashboard/loyalty/overview" },
  { feature: TeamFeature.Pipeline, to: "/dashboard/pipelines" },
];

const WHATSAPP_LANDING_PRIORITY: Array<{ feature: TeamFeature; to: string }> = [
  { feature: TeamFeature.Templates, to: "/dashboard/whatsapp/templates" },
  { feature: TeamFeature.Flows, to: "/dashboard/whatsapp/flows" },
  { feature: TeamFeature.Chatbots, to: "/dashboard/automation/journeys" },
  { feature: TeamFeature.Automation, to: "/dashboard/automation/rules" },
];

const PROTECTED_ROUTE_FEATURE_MAP: Array<[string, TeamFeature]> = [
  ["/dashboard/inbox", TeamFeature.Inbox],
  ["/dashboard/analytics", TeamFeature.Analytics],
  ["/dashboard/contacts", TeamFeature.Contacts],
  ["/dashboard/campaigns", TeamFeature.Campaigns],
  ["/dashboard/loyalty", TeamFeature.Loyalty],
  ["/dashboard/commerce", TeamFeature.Commerce],
  ["/dashboard/pipelines", TeamFeature.Pipeline],
  ["/dashboard/surveys", TeamFeature.WebForms],
  // First match wins: Journeys sit under /dashboard/automation but need their own feature.
  ["/dashboard/automation/journeys", TeamFeature.Chatbots],
  ["/dashboard/automation", TeamFeature.Automation],
  ["/dashboard/whatsapp/flows", TeamFeature.Flows],
  // Old journey addresses; they only redirect into /dashboard/automation/journeys now.
  ["/dashboard/journeys", TeamFeature.Chatbots],
  ["/dashboard/chatbots", TeamFeature.Chatbots],
  ["/dashboard/whatsapp/flowbots", TeamFeature.Chatbots],
  ["/dashboard/instagram/flowbots", TeamFeature.Chatbots],
  ["/dashboard/messenger/flowbots", TeamFeature.Chatbots],
  // Instagram's and Messenger's pages hold comment automations, menus and links, so they
  // follow the Automation permission, as their entries under Meta do.
  ["/dashboard/instagram", TeamFeature.Automation],
  ["/dashboard/messenger", TeamFeature.Automation],
  ["/dashboard/whatsapp/templates", TeamFeature.Templates],
  ["/dashboard/meta-agent", TeamFeature.AiChatbot],
  ["/dashboard/qr-codes", TeamFeature.QrStudio],
  ["/dashboard/link-pages", TeamFeature.QrStudio],
  ["/dashboard/apps&services", TeamFeature.AppsServices],
  ["/dashboard/settings/channels", TeamFeature.Automation],
  ["/dashboard/settings/integrations", TeamFeature.AppsServices],
];

export const DASHBOARD_NO_PERMISSION_FALLBACK = "/dashboard/settings";

export function getDashboardLandingTarget(
  allowedFeatures: ReadonlySet<string>,
  hiddenModules: readonly string[] = [],
): string {
  for (const item of DASHBOARD_LANDING_PRIORITY) {
    const module = getModuleForDashboardPath(item.to)?.key;
    if (allowedFeatures.has(item.feature) && !(module && hiddenModules.includes(module))) {
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
  ["/dashboard/campaigns", SubscriptionFeaturePathName.WhatsappCampaign, "Campaigns"],
  ["/dashboard/loyalty", SubscriptionFeaturePathName.WhatsappLoyalty, "Loyalty"],
  ["/dashboard/commerce", SubscriptionFeaturePathName.WhatsappCatalog, "Commerce"],
  ["/dashboard/surveys", SubscriptionFeaturePathName.WebSurvey, "Surveys"],
  ["/dashboard/meta-agent", SubscriptionFeaturePathName.AI, "Meta AI Agent"],
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
