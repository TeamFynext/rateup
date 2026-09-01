import { IconBrandWhatsapp, IconLogout, IconPencilMinus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useDeregisterBusinessClientMutation } from "@/backend/whatsapp/settings/waSettings.query";
import { ContinueWithFacebookButton } from "@/components/common/continue-with-facebook-button.tsx";
import { SetupRowCard } from "@/components/common/setup-row-card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";

import { WaSettingEditModal } from "./wa-setting-edit-modal.tsx";

type WaSetting = WaSettings[number];

export function MetaLoginStatus({ waSettings }: Readonly<{ waSettings?: WaSettings }>) {
  const deRegisterMutation = useDeregisterBusinessClientMutation();
  const [selectedWaSettings, setSelectedWaSettings] = useState<WaSetting | null>(null);
  const [openedEdit, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const { t: translations } = useTranslation();
  const confirm = useConfirm();

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
      <div className="mt-4 flex flex-col items-center gap-4 rounded-lg border border-dashed bg-muted p-8">
        <p className="text-sm text-muted-foreground">
          {translations("No WhatsApp Business accounts connected yet.")}
        </p>
        <ContinueWithFacebookButton buttonType="login_with" />
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex justify-end">
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
          badges={<Badge variant="secondary">{setting.type || "Automated"}</Badge>}
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
              onClick={() => handleDeRegister(setting.phoneId)}
              className="flex cursor-pointer items-center gap-1 text-xs text-destructive underline-offset-4 hover:underline"
            >
              <IconLogout size={13} />
              {translations("Disconnect")}
            </button>
          }
        />
      ))}

      <WaSettingEditModal opened={openedEdit} close={closeEdit} waSetting={selectedWaSettings} />
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
