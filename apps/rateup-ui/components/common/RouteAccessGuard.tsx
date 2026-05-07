"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { TeamFeature } from "@/types/enums";
import { useTeamFeatures } from "@/context/TeamFeaturesContext";

/**
 * Maps a route prefix to the TeamFeature required to access it.
 * Order matters: more-specific prefixes must come before less-specific ones.
 *
 * /dashboard/settings is intentionally excluded — it is always accessible
 * so members with no other permissions still have somewhere to land.
 */
const ROUTE_FEATURE_MAP: Array<[string, TeamFeature]> = [
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
  ["/dashboard/whatsapp/templates", TeamFeature.Templates],
  ["/dashboard/qr-studio", TeamFeature.QrStudio],
  ["/dashboard/apps&services", TeamFeature.AppsServices],
  ["/dashboard/menu", TeamFeature.DigitalMenu],
  ["/dashboard/settings/channels", TeamFeature.Automation],
  ["/dashboard/settings/integrations", TeamFeature.AppsServices],
];

/** The fallback route when a member has no feature permissions at all. */
const NO_PERMISSION_FALLBACK = "/dashboard/settings";

/**
 * Client-side route guard. Redirects MEMBER-role users away from routes
 * their teams have not been granted access to.
 *
 * - /dashboard/settings is always allowed (excluded from the map).
 * - Members with an empty feature set are sent to /dashboard/settings.
 * - Owners / admins (allowedFeatures === null) bypass all checks.
 */
export function RouteAccessGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { allowedFeatures, isPending } = useTeamFeatures();

  useEffect(() => {
    // null = bypass (super-admin), Set = restrict (member)
    if (allowedFeatures === null || isPending) return;

    // /dashboard exactly → will be handled by dashboard/page.tsx redirect;
    // let it pass through here so that page can choose the right destination.
    if (pathname === "/dashboard") return;

    const required = ROUTE_FEATURE_MAP.find(([prefix]) =>
      pathname.startsWith(prefix),
    )?.[1];

    if (required && !allowedFeatures.has(required)) {
      router.replace(NO_PERMISSION_FALLBACK);
    }
  }, [pathname, allowedFeatures, isPending, router]);

  return <>{children}</>;
}
