import { Alert, AlertDescription, AlertTitle } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rateup/ui/components/dialog";
import { Field, FieldLabel } from "@rateup/ui/components/field";
import { IconAlertCircle, IconBrandWhatsapp, IconCircleCheck } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { sendShopProductToMe } from "@/backend/commerce/shop.api";
import { useGetUserProfile } from "@/backend/user/user.query.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { getApiErrorMessage } from "@/utils/apiError.ts";

/** The profile endpoint is untyped; this reads its phone, as "+<digits>" for the phone input. */
function profilePhone(response: unknown): string {
  if (typeof response !== "object" || response === null || !("data" in response)) return "";
  const body = response.data;
  if (typeof body !== "object" || body === null || !("data" in body)) return "";
  const profile = body.data;
  if (typeof profile !== "object" || profile === null || !("phone" in profile)) return "";
  const digits = typeof profile.phone === "string" ? profile.phone.replace(/[^\d]/g, "") : "";
  return digits ? `+${digits}` : "";
}

/** Sends one product to the merchant's own WhatsApp, so they see exactly what a customer gets. */
export function SendToMeDialog({
  productId,
  open,
  onOpenChange,
}: Readonly<{ productId: string; open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Send to my WhatsApp")}</DialogTitle>
          <DialogDescription>
            {t("See this product the way a customer gets it in chat.")}
          </DialogDescription>
        </DialogHeader>
        {open && <SendToMeBody productId={productId} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SendToMeBody({
  productId,
  onClose,
}: Readonly<{ productId: string; onClose: () => void }>) {
  const { t } = useTranslation();
  const { data: profile } = useGetUserProfile();
  const [typed, setTyped] = useState<string | null>(null);
  const phone = typed ?? profilePhone(profile);
  const send = useMutation({ mutationFn: () => sendShopProductToMe(productId, phone) });
  const result = send.data;

  if (result?.sent) {
    return (
      <>
        <Alert>
          <IconCircleCheck className="text-green-600 dark:text-green-500" />
          <AlertTitle>{t("Sent. Check your WhatsApp.")}</AlertTitle>
          <AlertDescription>
            {result.asProductCard
              ? t("It arrived as a product card, the same one customers can add to a cart.")
              : result.catalogNotConnected
                ? t(
                    "It arrived as a link. Your shop's catalog isn't the one connected to your WhatsApp number, so product cards can't be sent. Choose the catalog again in Commerce → Settings to connect it.",
                  )
                : t(
                    "It arrived as a photo with a link, because the product is not live in your WhatsApp catalog yet.",
                  )}
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <Button onClick={onClose}>{t("Done")}</Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (phone) send.mutate();
      }}
    >
      <Field>
        <FieldLabel htmlFor="send-to-me-phone">{t("Your WhatsApp number")}</FieldLabel>
        <PhoneInput
          id="send-to-me-phone"
          value={phone}
          onChange={(value) => setTyped(value ?? "")}
          placeholder={t("WhatsApp number")}
        />
      </Field>

      {result && !result.sent && (
        <Alert>
          <IconBrandWhatsapp />
          <AlertTitle>{t("Message your business number first, then try again")}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>
              {t(
                "WhatsApp only lets a business message you within 24 hours of your last message to it.",
              )}
            </span>
            <span className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                render={<a href={result.openChatUrl} target="_blank" rel="noopener noreferrer" />}
              >
                <IconBrandWhatsapp data-icon="inline-start" />
                {t("Open WhatsApp")}
              </Button>
              <Button type="submit" size="sm" loading={send.isPending}>
                {t("Retry")}
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}
      {send.isError && (
        <Alert variant="destructive">
          <IconAlertCircle />
          <AlertDescription>
            {getApiErrorMessage(send.error, t("Couldn't send the product."))}
          </AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t("Cancel")}
        </Button>
        <Button type="submit" loading={send.isPending} disabled={!phone}>
          <IconBrandWhatsapp data-icon="inline-start" />
          {t("Send")}
        </Button>
      </DialogFooter>
    </form>
  );
}
