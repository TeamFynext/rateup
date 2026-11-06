import {
  IconLink,
  IconMessage2Code,
  IconShoppingBag,
  IconShoppingCartPlus,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

import { CreateOrderDialog } from "../shop/CreateOrderDialog.tsx";
import { SendProductsDialog } from "./SendProductsDialog.tsx";
import { type SellingContact, useInboxSelling } from "./useInboxSelling.ts";

export type SellDialog = "products" | "order" | null;

/** The two selling dialogs, for a host that renders its own menu (the composer's "+" menu). */
export function InboxSellDialogs({
  contact,
  open,
  onOpenChange,
  sessionExpired = false,
  onSendText,
}: Readonly<{
  contact: SellingContact;
  open: SellDialog;
  onOpenChange: (open: SellDialog) => void;
  sessionExpired?: boolean;
  /** Sends plain text through the composer, for the storefront-link fallback. */
  onSendText?: (text: string) => void;
}>) {
  const { enabled, channel, channelAccountId } = useInboxSelling(contact);
  if (!enabled) return null;
  return (
    <>
      {channel && (
        <SendProductsDialog
          open={open === "products"}
          onOpenChange={(next) => onOpenChange(next ? "products" : null)}
          contactId={contact.id}
          channel={channel}
          channelAccountId={channelAccountId}
          onSendText={onSendText}
        />
      )}
      <CreateOrderDialog
        open={open === "order"}
        onOpenChange={(next) => onOpenChange(next ? "order" : null)}
        chat={{ contactId: contact.id, channel, channelAccountId, sessionExpired }}
      />
    </>
  );
}

/** Menu entries matching `InboxSellDialogs`; renders nothing where the agent cannot sell. */
export function InboxSellMenuItems({
  contact,
  onOpen,
  sessionExpired = false,
  onSendTemplate,
}: Readonly<{
  contact: SellingContact;
  onOpen: (dialog: SellDialog) => void;
  sessionExpired?: boolean;
  /** Opens the template picker; offered when the closed window blocks sending products. */
  onSendTemplate?: () => void;
}>) {
  const { t } = useTranslation();
  const { enabled, channel } = useInboxSelling(contact);
  if (!enabled) return null;
  return (
    <>
      {channel && !sessionExpired && (
        <DropdownMenuItem className="gap-2 text-xs" onClick={() => onOpen("products")}>
          <IconShoppingBag size={16} className="text-primary" />
          {t("Send products")}
        </DropdownMenuItem>
      )}
      {channel && sessionExpired && (
        <>
          <DropdownMenuItem disabled className="items-start gap-2 text-xs">
            <IconShoppingBag size={16} className="mt-0.5" />
            <span className="flex flex-col">
              {t("Send products")}
              <span className="text-[11px] text-muted-foreground">
                {channel === "WHATSAPP"
                  ? t("Window closed — send a template first")
                  : t("Window closed — wait for them to message you")}
              </span>
            </span>
          </DropdownMenuItem>
          {onSendTemplate && channel === "WHATSAPP" && (
            <DropdownMenuItem className="gap-2 text-xs" onClick={onSendTemplate}>
              <IconMessage2Code size={16} className="text-primary" />
              {t("Send a template")}
            </DropdownMenuItem>
          )}
        </>
      )}
      <DropdownMenuItem className="gap-2 text-xs" onClick={() => onOpen("order")}>
        <IconLink size={16} className="text-primary" />
        {t("Create order / payment link")}
      </DropdownMenuItem>
    </>
  );
}

/** A composer toolbar button: sell from the conversation without leaving it. */
export function InboxSellButton({
  contact,
  sessionExpired = false,
  onSendTemplate,
  onSendText,
}: Readonly<{
  contact: SellingContact;
  sessionExpired?: boolean;
  onSendTemplate?: () => void;
  onSendText?: (text: string) => void;
}>) {
  const { t } = useTranslation();
  const { enabled } = useInboxSelling(contact);
  const [open, setOpen] = useState<SellDialog>(null);
  if (!enabled) return null;

  return (
    <>
      <DropdownMenu>
        <CustomTooltip
          trigger={
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" className="size-7 p-0" aria-label={t("Sell")} />
              }
            >
              <IconShoppingCartPlus className="size-4 text-primary" />
            </DropdownMenuTrigger>
          }
          content={<p>{t("Sell")}</p>}
        />
        <DropdownMenuContent align="start">
          <InboxSellMenuItems
            contact={contact}
            onOpen={setOpen}
            sessionExpired={sessionExpired}
            onSendTemplate={onSendTemplate}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <InboxSellDialogs
        contact={contact}
        open={open}
        onOpenChange={setOpen}
        sessionExpired={sessionExpired}
        onSendText={onSendText}
      />
    </>
  );
}
