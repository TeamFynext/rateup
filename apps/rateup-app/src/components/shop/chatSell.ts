import type { ChatChannel } from "@/api/shop/shop.type";
import { useSubscription } from "@/api/subscription/subscription.query";
import { MessagePlatform } from "@/constants/enums";
import { useOrgModules } from "@/hooks/useOrgModules";
import { usePermissions } from "@/hooks/usePermissions";
import { hasFeature } from "@/utils/subscription";
import { SubscriptionFeaturePathName } from "../../../enums";

/** The inbox calls Messenger `FACEBOOK`; the shop calls it `MESSENGER`. Web chat can't sell. */
export function chatChannelFor(platform: string): ChatChannel | null {
  switch (platform) {
    case MessagePlatform.WHATSAPP:
      return "WHATSAPP";
    case MessagePlatform.INSTAGRAM:
      return "INSTAGRAM";
    case MessagePlatform.FACEBOOK:
      return "MESSENGER";
    default:
      return null;
  }
}

/** `/api/shop` also refuses any org whose plan lacks `whatsapp.catalog` (`shop.route.ts`). */
export function useCommerceAccess() {
  const { can, isLoading } = usePermissions();
  const { isOn } = useOrgModules();
  const { data: subscription, isPending } = useSubscription();
  const on =
    isOn("commerce") && hasFeature(subscription, SubscriptionFeaturePathName.WhatsappCatalog);
  return {
    canRead: on && can("commerce.read"),
    canSell: on && can("commerce.sell"),
    canManageOrders: on && can("commerce.orders.manage"),
    isPending: isPending || isLoading,
  };
}
