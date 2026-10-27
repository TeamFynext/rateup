import { useCommerceAccess } from "@/components/shop/chatSell";
import { usePermissions } from "@/hooks/usePermissions";
import { Ionicons } from "@expo/vector-icons";
import type React from "react";

export type MoreIconName = React.ComponentProps<typeof Ionicons>["name"];

export type MoreMenuItem = {
  key: string;
  icon: MoreIconName;
  label: string;
  hint?: string;
  /** The tile's icon colour; the tile behind it is the same colour, faded. */
  tint: string;
  href: string;
};

/**
 * Everything behind the More tab, in display order. Android's bottom bar holds at most
 * five items, so any feature that is not an everyday tab goes here: add one entry, and
 * return it only for the roles that can open it.
 */
export function useMoreMenuItems(): MoreMenuItem[] {
  const { can } = usePermissions();
  const { canRead: canReadOrders } = useCommerceAccess();

  const items: (MoreMenuItem | false)[] = [
    {
      key: "account",
      tint: "#1C518E",
      icon: "person-circle",
      label: "Account",
      hint: "Profile, status, appearance, security and log out",
      href: "/protected/more/account",
    },
    canReadOrders && {
      key: "orders",
      tint: "#F59E0B",
      icon: "bag-handle",
      label: "Orders",
      hint: "Pack, ship and follow up on shop orders",
      href: "/protected/orders",
    },
    can("inbox.read") && {
      key: "calls",
      tint: "#10B981",
      icon: "call",
      label: "Calls",
      hint: "Call history",
      href: "/protected/calls",
    },
  ];

  return items.filter((i): i is MoreMenuItem => Boolean(i));
}
