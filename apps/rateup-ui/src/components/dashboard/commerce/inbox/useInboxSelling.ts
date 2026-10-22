import { usePhoneIdStore } from "@/components/whatsapp/inbox/chatselect/accountSelectorStore.ts";
import { useOrgModules } from "@/hooks/useOrgModules.ts";
import { useCan } from "@/hooks/usePermission.ts";
import { MessagePlatform } from "@/types/enums.ts";
import { getContactPlatform } from "@/utils/whatsapp/inbox.ts";

export type ChatShopChannel = "WHATSAPP" | "INSTAGRAM" | "MESSENGER";

const SHOP_CHANNEL: Partial<Record<MessagePlatform, ChatShopChannel>> = {
  [MessagePlatform.WHATSAPP]: "WHATSAPP",
  [MessagePlatform.INSTAGRAM]: "INSTAGRAM",
  [MessagePlatform.FACEBOOK]: "MESSENGER",
};

export type SellingContact = Parameters<typeof getContactPlatform>[0] & { id: string };

/**
 * Whether the agent may sell in this conversation, and where a send goes. The account is the
 * composer's own pick (seeded from the thread: a WhatsApp phoneId, or the Instagram account /
 * Facebook page id), so products and links leave on the number the customer wrote to.
 */
export function useInboxSelling(contact: SellingContact | null | undefined) {
  const canSell = useCan("commerce.sell");
  const { isOn } = useOrgModules();
  const { whatsappSettingsPhoneId } = usePhoneIdStore();
  const platform = getContactPlatform(contact);

  return {
    enabled: Boolean(contact) && canSell && isOn("commerce"),
    /** Null on webchat: orders can still be made there, but nothing is sent. */
    channel: SHOP_CHANNEL[platform] ?? null,
    channelAccountId: whatsappSettingsPhoneId || null,
  };
}
