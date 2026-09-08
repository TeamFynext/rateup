import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { WaTemplateDraftPayload } from "@/backend/whatsapp/whatsapp.api";
import { useSaveTemplateAsDraftMutation } from "@/backend/whatsapp/whatsapp.query";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { TemplateType } from "@/types/enums.ts";

import type { LoyaltyEventDefinition } from "./loyaltyEventCatalog.ts";

/**
 * Turns an event's example into a draft template on the chosen WhatsApp account and opens
 * the editor to submit it. Draft first: Meta approval takes hours and a wrong number is
 * cheap to fix before that.
 */
export function CreateTemplateFromExampleDialog({
  definition,
  onClose,
  onCreated,
}: Readonly<{
  definition: LoyaltyEventDefinition | null;
  onClose: () => void;
  onCreated: (templateId: string) => void;
}>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [accountId, setAccountId] = useState("");
  const saveDraft = useSaveTemplateAsDraftMutation(
    "",
    () => {},
    () => {},
  );

  const create = () => {
    if (!definition || !accountId) {
      toast.error(t("Pick a WhatsApp account first."));
      return;
    }
    const payload: WaTemplateDraftPayload = {
      name: definition.templateName,
      header: null,
      language: "en",
      body: definition.body,
      footer: "Powered by rateup.app",
      category: "UTILITY",
      format: "NONE",
      buttons: [],
      status: "DRAFT",
      example: definition.example,
      templateType: TemplateType.LOYALTY,
      mediaCarousel: [],
      productCarousel: [],
      whatsappSettingsPhoneId: accountId,
      defaultValues: {
        catalog: {
          thumbnail_product_retailer_id: "",
          mpm: { sections: [] },
          spm: { product_retailer_id: "" },
          catalogId: "",
        },
        whatsappSettingsPhoneId: accountId,
      },
    };
    saveDraft.mutate(payload, {
      onSuccess: (data) => {
        const templateId = (data as { data?: { id?: string } })?.data?.id;
        toast.success(t("Draft created — submit it to Meta from the editor."));
        onClose();
        if (templateId) {
          onCreated(templateId);
          navigate({ to: "/dashboard/loyalty/templates/$templateId", params: { templateId } });
        }
      },
    });
  };

  return (
    <Dialog open={definition !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{definition?.label}</DialogTitle>
          <DialogDescription>
            {t("A draft template on the account you pick, ready to submit to Meta.")}
          </DialogDescription>
        </DialogHeader>
        {definition && (
          <p className="rounded-md bg-muted/40 px-3 py-2 text-sm text-foreground">
            {definition.body}
          </p>
        )}
        <AccountSelector
          value={accountId}
          onChange={(value) => setAccountId(value ?? "")}
          label={t("WhatsApp account")}
          withAllOption={false}
          optional={false}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button onClick={create} disabled={saveDraft.isPending || !accountId}>
            {saveDraft.isPending ? t("Creating…") : t("Create draft")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
