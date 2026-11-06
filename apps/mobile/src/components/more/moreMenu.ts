import { useCommerceAccess } from "@/components/shop/chatSell";
import { usePermissions } from "@/hooks/usePermissions";
import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import type { SFSymbol } from "expo-symbols";

export type MoreIconName = React.ComponentProps<typeof Ionicons>["name"];

export type MoreMenuItem = {
  key: string;
  icon: MoreIconName;
  /** Android's menu sheet icon: the outline Ionicon, like an unselected tab. */
  iconOutline: MoreIconName;
  /** iOS's menu sheet icon: the SF Symbol, like the tab bar. Must exist on iOS 16.4. */
  sf: SFSymbol;
  label: string;
  hint?: string;
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
      icon: "person-circle",
      iconOutline: "person-circle-outline",
      sf: "person.crop.circle.fill",
      label: "Profile",
      hint: "Status, appearance, password and log out",
      href: "/protected/more/account",
    },
    canReadOrders && {
      key: "orders",
      icon: "bag-handle",
      iconOutline: "bag-handle-outline",
      sf: "bag.fill",
      label: "Orders",
      hint: "Pack, ship and follow up on shop orders",
      href: "/protected/more/orders",
    },
    can("inbox.read") && {
      key: "calls",
      icon: "call",
      iconOutline: "call-outline",
      sf: "phone.fill",
      label: "Calls",
      hint: "Missed, incoming and outgoing WhatsApp calls",
      href: "/protected/more/calls",
    },
    can("meta_agent.read") && {
      key: "meta-ai",
      icon: "sparkles",
      iconOutline: "sparkles-outline",
      sf: "sparkles",
      label: "Meta AI",
      hint: "Conversations it answered, handovers and usage caps",
      href: "/protected/more/meta-ai",
    },
  ];

  return items.filter((i): i is MoreMenuItem => Boolean(i));
}
