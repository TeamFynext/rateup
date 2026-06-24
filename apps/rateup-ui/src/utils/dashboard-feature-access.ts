import { TeamFeature } from "@/types/enums.ts";

const DASHBOARD_LANDING_PRIORITY: Array<{ feature: TeamFeature; to: string }> = [
  { feature: TeamFeature.Inbox, to: "/dashboard/inbox?tab=New" },
  { feature: TeamFeature.Analytics, to: "/dashboard/analytics" },
  { feature: TeamFeature.Contacts, to: "/dashboard/contacts" },
  { feature: TeamFeature.Campaigns, to: "/dashboard/campaign" },
  { feature: TeamFeature.Loyalty, to: "/dashboard/loyalty/dashboard" },
  { feature: TeamFeature.Tickets, to: "/dashboard/tickets" },
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
  ["/dashboard/tickets", TeamFeature.Tickets],
  ["/dashboard/surveys", TeamFeature.WebForms],
  ["/dashboard/automation", TeamFeature.Automation],
  ["/dashboard/whatsapp/flows", TeamFeature.Flows],
  ["/dashboard/whatsapp/flowbots", TeamFeature.Chatbots],
  ["/dashboard/instagram/flowbots", TeamFeature.Chatbots],
  ["/dashboard/whatsapp/templates", TeamFeature.Templates],
  ["/dashboard/qr-studio", TeamFeature.QrStudio],
  ["/dashboard/apps&services", TeamFeature.AppsServices],
  ["/dashboard/menu", TeamFeature.DigitalMenu],
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
