import { IconAlertCircle } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { sendShopProductsInChat, type ShopProduct } from "@/backend/commerce/shop.api";
import { useShopStore } from "@/backend/commerce/shop.query";
import { productHandle } from "@/components/shop-public/storefrontSeo.ts";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { SHOP_PATHS } from "../shop/shopMeta.ts";
import { ProductPicker } from "./ProductPicker.tsx";
import type { ChatShopChannel } from "./useInboxSelling.ts";

/** WhatsApp product lists take 30 items, Instagram and Messenger carousels 10. */
const LIMIT: Record<ChatShopChannel, number> = { WHATSAPP: 30, INSTAGRAM: 10, MESSENGER: 10 };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  channel: ChatShopChannel;
  channelAccountId: string | null;
  /** The composer's own text send; without it there is no storefront-link fallback. */
  onSendText?: (text: string) => void;
}

export function SendProductsDialog({ open, onOpenChange, ...rest }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{t("Send products")}</DialogTitle>
          <DialogDescription>
            {rest.channel === "WHATSAPP"
              ? t("They arrive as WhatsApp product cards the customer can add to a cart.")
              : t("They arrive as product cards with a Buy button.")}
          </DialogDescription>
        </DialogHeader>
        {open && <SendProductsBody {...rest} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SendProductsBody({
  contactId,
  channel,
  channelAccountId,
  onSendText,
  onDone,
}: Readonly<Omit<Props, "open" | "onOpenChange"> & { onDone: () => void }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: store } = useShopStore();
  const storefrontUrl = store?.storefrontEnabled ? store.storefrontUrl : undefined;
  const sendStorefrontLink =
    onSendText && storefrontUrl
      ? (product: ShopProduct) => {
          onSendText(
            `${product.title}\n${storefrontUrl}/p/${encodeURIComponent(productHandle(product))}`,
          );
          toast.success(t("Storefront link sent"));
        }
      : undefined;
  const [selected, setSelected] = useState<ReadonlyMap<string, ShopProduct>>(new Map());
  const [text, setText] = useState("");
  const limit = LIMIT[channel];

  const send = useMutation({
    mutationFn: () =>
      sendShopProductsInChat({
        contactId,
        channel,
        channelAccountId,
        productIds: [...selected.keys()],
        text: text.trim() || undefined,
      }),
    onSuccess: ({ sent, skipped }) => {
      if (skipped) {
        toast.warning(
          t("{sent, plural, one {# product sent} other {# products sent}}, {skipped} skipped", {
            sent,
            skipped,
          }),
          {
            description: t("Skipped products aren't live in your WhatsApp catalog yet."),
            action: {
              label: t("Open Products"),
              onClick: () => void navigate({ to: SHOP_PATHS.products }),
            },
          },
        );
      } else {
        toast.success(t("{sent, plural, one {# product sent} other {# products sent}}", { sent }));
      }
      onDone();
    },
  });

  return (
    <>
      <ProductPicker
        mode="products"
        channel={
          channel === "WHATSAPP" ? "whatsapp" : channel === "INSTAGRAM" ? "instagram" : undefined
        }
        selected={selected}
        onSendStorefrontLink={sendStorefrontLink}
        onToggle={(product) =>
          setSelected((current) => {
            const next = new Map(current);
            if (next.has(product.id)) next.delete(product.id);
            else if (next.size < limit) next.set(product.id, product);
            return next;
          })
        }
      />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        placeholder={t("Add a message (optional)")}
        aria-label={t("Message")}
      />
      {send.isError && (
        <Alert variant="destructive">
          <IconAlertCircle />
          <AlertDescription>
            {getApiErrorMessage(send.error, t("Couldn't send the products."))}
          </AlertDescription>
        </Alert>
      )}
      <DialogFooter className="items-center sm:justify-between">
        <span className="text-xs text-muted-foreground">
          {selected.size >= limit
            ? t("Up to {limit} products per message", { limit })
            : t("{count, plural, =0 {Nothing selected} one {# selected} other {# selected}}", {
                count: selected.size,
              })}
        </span>
        <Button disabled={!selected.size} loading={send.isPending} onClick={() => send.mutate()}>
          {t("{count, plural, =0 {Send products} one {Send # product} other {Send # products}}", {
            count: selected.size,
          })}
        </Button>
      </DialogFooter>
    </>
  );
}
