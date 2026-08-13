import { IconLogout, IconPencilMinus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useDeregisterBusinessClientMutation } from "@/backend/whatsapp/settings/waSettings.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";

import { ConnectMetaAccountButton } from "./connect-meta-account-button.tsx";
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
      <div className="flex h-full items-center justify-center rounded bg-muted">
        <div className="flex flex-col items-center gap-4 p-4">
          <p className="text-sm">No WhatsApp Business Accounts Connected</p>
          <ConnectMetaAccountButton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {translations("Linked WhatsApp Business Accounts")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {translations("Manage your connected WhatsApp Business accounts and team access")}
          </p>
        </div>
        <ConnectMetaAccountButton />
      </div>
      <div className="grid gap-4">
        {waSettings.map((setting) => {
          return (
            <Card
              key={setting.id || setting.phoneId}
              className="border-border/80 hover:border-border/90 transition-colors"
            >
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header with Edit & Logout buttons */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-base">
                          {setting.phoneDisplayName || setting.phone || "Unnamed Account"}
                        </h4>
                        <Badge variant="secondary" className="text-[10px]">
                          {setting.type || "Automated"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{setting.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedWaSettings(setting);
                                openEdit();
                              }}
                            >
                              <IconPencilMinus size={18} />
                            </Button>
                          }
                        />
                        <TooltipContent>{translations("Edit channel")}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeRegister(setting.phoneId)}
                            >
                              <IconLogout size={18} />
                            </Button>
                          }
                        />
                        <TooltipContent>
                          {translations("Logout from this WhatsApp Business Account")}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <Separator />

                  {/* Account Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                        {translations("Business ID")}
                      </p>
                      <code className="text-sm font-mono text-foreground mt-1 break-all">
                        {setting.wabaId}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                        {translations("Phone ID")}
                      </p>
                      <code className="text-sm font-mono text-foreground mt-1 break-all">
                        {setting.phoneId}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                        {translations("App ID")}
                      </p>
                      <code className="text-sm font-mono text-foreground mt-1 break-all">
                        {setting.appId}
                      </code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <WaSettingEditModal opened={openedEdit} close={closeEdit} waSetting={selectedWaSettings} />
    </div>
  );
}
