import {
  IconBolt,
  IconBuilding,
  IconBuildingStore,
  IconCreditCard,
  IconDatabase,
  IconGauge,
  IconHistory,
  IconLayoutDashboard,
  IconPackage,
  IconRefresh,
  IconShieldLock,
  IconShoppingCart,
  IconStar,
  IconTool,
  IconUserShare,
  type Icon,
} from "@tabler/icons-react";
import type { LinkProps } from "@tanstack/react-router";

export interface NavItem {
  title: string;
  to: LinkProps["to"];
  icon: Icon;
}

/**
 * A rail icon. `panel` is what the white column beside the rail shows while it is active:
 * the section's page links, the organisation directory, or nothing (full-width page).
 */
export interface NavGroup {
  id: string;
  title: string;
  icon: Icon;
  panel: "pages" | "orgs" | "none";
  items: NavItem[];
}

/** Single source for the rail, the nav panel and the ⌘K "Go to" group. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    title: "Overview",
    icon: IconLayoutDashboard,
    panel: "none",
    items: [{ title: "Overview", to: "/", icon: IconGauge }],
  },
  {
    id: "orgs",
    title: "Organisations",
    icon: IconBuilding,
    panel: "orgs",
    items: [{ title: "Organisations", to: "/orgs", icon: IconBuilding }],
  },
  {
    id: "billing",
    title: "Billing",
    icon: IconCreditCard,
    panel: "pages",
    items: [
      { title: "Plans", to: "/billing/plans", icon: IconStar },
      { title: "Razorpay", to: "/billing/razorpay", icon: IconBolt },
      { title: "Stripe", to: "/billing/stripe", icon: IconCreditCard },
      { title: "Orders", to: "/billing/orders", icon: IconShoppingCart },
      { title: "Subscriptions", to: "/billing/subscriptions", icon: IconPackage },
    ],
  },
  {
    id: "ops",
    title: "Operations",
    icon: IconTool,
    panel: "pages",
    items: [
      { title: "Update center", to: "/ops/update-center", icon: IconRefresh },
      { title: "Test data", to: "/ops/test-data", icon: IconDatabase },
      { title: "Shopify", to: "/ops/shopify", icon: IconBuildingStore },
      { title: "Referrals", to: "/ops/referrals", icon: IconUserShare },
    ],
  },
  {
    id: "access",
    title: "Staff",
    icon: IconShieldLock,
    panel: "pages",
    items: [
      { title: "Staff members", to: "/staff", icon: IconShieldLock },
      { title: "Audit log", to: "/audit", icon: IconHistory },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export function isItemActive(pathname: string, to: string): boolean {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

/** The group owning the current page; Overview for anything unmatched. */
export function activeGroup(pathname: string): NavGroup {
  return (
    NAV_GROUPS.find((group) =>
      group.items.some((item) => isItemActive(pathname, item.to as string)),
    ) ?? NAV_GROUPS[0]
  );
}

/** The page the pathname is on (an org's page counts as Organisations), if it is in the nav. */
export function activeItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => isItemActive(pathname, item.to as string));
}
