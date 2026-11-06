import React from "react";

import type { ChatChannel } from "@/api/shop/shop.type";

import CreateOrderSheet from "./CreateOrderSheet";
import SendProductsSheet from "./SendProductsSheet";

export type ChatSellSheet = "products" | "order" | null;

/**
 * Both sheets for one conversation. Mounted unconditionally by the composer so a sheet
 * outlives the menu that opened it.
 */
export default function ChatSellSheets({
  open,
  onClose,
  contactId,
  channel,
  channelAccountId,
}: Readonly<{
  open: ChatSellSheet;
  onClose: () => void;
  contactId: string;
  channel: ChatChannel;
  /** WhatsApp's phone-number id or the IG/page id the thread runs on — the composer's `whatsappSettingsPhoneId`. */
  channelAccountId: string | null;
}>) {
  return (
    <>
      <SendProductsSheet
        visible={open === "products"}
        onClose={onClose}
        contactId={contactId}
        channel={channel}
        channelAccountId={channelAccountId}
      />
      <CreateOrderSheet
        visible={open === "order"}
        onClose={onClose}
        contactId={contactId}
        channel={channel}
        channelAccountId={channelAccountId}
      />
    </>
  );
}
