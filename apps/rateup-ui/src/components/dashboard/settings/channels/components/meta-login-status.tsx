import { IconBrandWhatsapp, IconLogout, IconPencilMinus, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import {
  useDeleteWaSettingsMutation,
  useDeregisterBusinessClientMutation,
} from "@/backend/whatsapp/settings/waSettings.query";
import { ContinueWithFacebookButton } from "@/components/common/continue-with-facebook-button.tsx";
import { SetupRowCard } from "@/components/common/setup-row-card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from "@/components/ui/empty.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";
import { WaConfigType } from "@/types/enums.ts";

import { WaSettingEditModal } from "./wa-setting-edit-modal.tsx";
import { WaManualCredentialsForm } from "./whatsapp-manual-configuration.tsx";

type WaSetting = WaSettings[number];

export function MetaLoginStatus({ waSettings }: Readonly<{ waSettings?: WaSettings }>) {
  const deRegisterMutation = useDeregisterBusinessClientMutation();
  const deleteMutation = useDeleteWaSettingsMutation();
  const [addingManual, setAddingManual] = useState(false);
  const [selectedWaSettings, setSelectedWaSettings] = useState<WaSetting | null>(null);
  const [openedEdit, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const { t: translations } = useTranslation();
  const confirm = useConfirm();

  /** A manual number has nothing at Meta to de-register; its saved credentials are deleted. */
  async function handleRemoveManual(phoneId: string) {
    const shouldRemove = await confirm({
      title: translations("Remove this number?"),
      description: translations("Remove manually configured WhatsApp number"),
      warning: translations(
        "Its IDs and access token are deleted from RateUp. Nothing changes on Meta's side.",
      ),
      confirmText: translations("Remove"),
    });
    if (shouldRemove) deleteMutation.mutate(phoneId);
  }

  const addButtons = (
    <>
      <Button type="button" variant="outline" size="lg" onClick={() => setAddingManual(true)}>
        <IconPlus size={16} />
        {translations("Add manually")}
      </Button>
    </>
  );

  const addManualDialog = (
    <Dialog open={addingManual} onOpenChange={setAddingManual}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{translations("Add a number manually")}</DialogTitle>
          <DialogDescription>
            {translations(
              "Use the IDs and a permanent access token from your own Meta app, when you can't connect through Facebook.",
            )}
          </DialogDescription>
        </DialogHeader>
        <WaManualCredentialsForm
          waSettings={undefined}
          onCancel={() => setAddingManual(false)}
          onSaved={() => setAddingManual(false)}
        />
      </DialogContent>
    </Dialog>
  );

  async function handleDeRegister(accountId: string) {
    const shouldDeRegister = await confirm({
      title: translations("Confirmation Dialog"),
      description: translations("DeRegister WhatsApp Business Account"),
      warning: translations("Are you sure you want to DeRegister this WhatsApp Business Account?"),
      confirmText: translations("DeRegister"),
    });

    if (!shouldDeRegister) return;

    deRegisterMutation.mutate(accountId);
  }

  if (!waSettings?.length) {
    return (
      <Empty className="mt-4 border bg-muted">
        <EmptyHeader>
          <EmptyDescription>
            {translations("No WhatsApp Business accounts connected yet.")}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center gap-2">
          <ContinueWithFacebookButton buttonType="login_with" />
          {addButtons}
        </EmptyContent>
        {addManualDialog}
      </Empty>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap justify-end gap-2">
        {addButtons}
        <ContinueWithFacebookButton />
      </div>

      {waSettings.map((setting) => (
        <SetupRowCard
          key={setting.id || setting.phoneId}
          icon={IconBrandWhatsapp}
          tint="green"
          done
          title={setting.phoneDisplayName || setting.phone || translations("Unnamed account")}
          description={setting.phone}
          badges={
            <Badge variant="secondary">
              {setting.type === WaConfigType.Manual
                ? translations("Manual")
                : translations("Automated")}
            </Badge>
          }
          detail={
            <span className="flex flex-wrap gap-x-8 gap-y-2 pt-1">
              <IdField label={translations("Business ID")} value={setting.wabaId} />
              <IdField label={translations("Phone ID")} value={setting.phoneId} />
              <IdField label={translations("App ID")} value={setting.appId} />
            </span>
          }
          action={
            <Button
              variant="secondary"
              className="h-10 w-full"
              onClick={() => {
                setSelectedWaSettings(setting);
                openEdit();
              }}
            >
              <IconPencilMinus size={16} />
              {translations("Edit channel")}
            </Button>
          }
          actionFooter={
            <button
              type="button"
              onClick={() =>
                setting.type === WaConfigType.Manual
                  ? handleRemoveManual(setting.phoneId)
                  : handleDeRegister(setting.phoneId)
              }
              className="flex cursor-pointer items-center gap-1 text-xs text-destructive underline-offset-4 hover:underline"
            >
              <IconLogout size={13} />
              {translations("Disconnect")}
            </button>
          }
        />
      ))}

      <WaSettingEditModal opened={openedEdit} close={closeEdit} waSetting={selectedWaSettings} />
      {addManualDialog}
    </div>
  );
}

/** A Meta identifier, shown as the monospace value it is. */
function IdField({ label, value }: Readonly<{ label: string; value?: string | null }>) {
  if (!value) return null;

  return (
    <span className="flex flex-col">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <code className="font-mono text-sm break-all">{value}</code>
    </span>
  );
}
