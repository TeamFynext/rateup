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
  IconQrcode,
  IconRefresh,
  IconShieldLock,
  IconShoppingCart,
  IconStar,
  IconTool,
  IconUserShare,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";
import type { LinkProps } from "@tanstack/react-router";

export interface NavItem {
  title: string;
  to: LinkProps["to"];
  icon: Icon;
}

/** A rail icon; its items are the top bar's links while it is active. */
export interface NavGroup {
  id: string;
  title: string;
  icon: Icon;
  items: NavItem[];
}

/** Single source for the rail, the top bar and the ⌘K "Go to" group. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "workspace",
    title: "Workspace",
    icon: IconLayoutDashboard,
    items: [
      { title: "Overview", to: "/", icon: IconGauge },
      { title: "Organisations", to: "/orgs", icon: IconBuilding },
      { title: "Users", to: "/users", icon: IconUsers },
    ],
  },
  {
    id: "billing",
    title: "Billing",
    icon: IconCreditCard,
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
    title: "Ops",
    icon: IconTool,
    items: [
      { title: "Update center", to: "/ops/update-center", icon: IconRefresh },
      { title: "Test data", to: "/ops/test-data", icon: IconDatabase },
      { title: "Shopify", to: "/ops/shopify", icon: IconBuildingStore },
      { title: "Referrals", to: "/ops/referrals", icon: IconUserShare },
      { title: "Share QR", to: "/ops/share-qr", icon: IconQrcode },
    ],
  },
  {
    id: "access",
    title: "Access",
    icon: IconShieldLock,
    items: [
      { title: "Staff", to: "/staff", icon: IconShieldLock },
      { title: "Audit log", to: "/audit", icon: IconHistory },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export function isItemActive(pathname: string, to: string): boolean {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

/** The group owning the current page; the workspace for anything unmatched. */
export function activeGroup(pathname: string): NavGroup {
  return (
    NAV_GROUPS.find((group) =>
      group.items.some((item) => isItemActive(pathname, item.to as string)),
    ) ?? NAV_GROUPS[0]
  );
}
