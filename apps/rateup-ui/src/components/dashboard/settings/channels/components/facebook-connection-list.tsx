import { IconBrandFacebook } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useUpsertWaSettingsMutation } from "@/backend/whatsapp/settings/waSettings.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

import { FacebookConfigModal } from "./facebook-config-modal.tsx";

type WaSetting = WaSettings[number];

export function FacebookConnectionsList({
  waSettings,
}: Readonly<{
  waSettings: WaSettings | undefined;
}>) {
  const { t: translations } = useTranslation();
  const [selectedWaSettings, setSelectedWaSettings] = useState<WaSetting | null>(null);
  const [openedFacebookModal, setOpenedFacebookModal] = useState(false);
  const upsertMutation = useUpsertWaSettingsMutation();
  const confirm = useConfirm();

  const openFacebookModal = (setting: WaSetting) => {
    setSelectedWaSettings(setting);
    setOpenedFacebookModal(true);
  };

  const disconnectFacebook = (setting: WaSetting) => {
    const { ...rest } = setting;

    upsertMutation.mutate({
      ...rest,
      fbPageId: "",
      pageAccessToken: "",
      ibaId: "",
      igUserName: "",
      igDisplayName: "",
    });
  };

  const handleDisconnectFacebook = async (setting: WaSetting) => {
    const shouldDisconnect = await confirm({
      title: translations("Disconnect Facebook Page and Instagram?"),
      description: translations(
        "Disconnecting this Facebook Page will also disconnect the linked Instagram account from this channel.",
      ),
      confirmText: translations("Disconnect"),
      cancelText: translations("Cancel"),
    });

    if (!shouldDisconnect) return;

    disconnectFacebook(setting);
  };

  if (!waSettings?.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{translations("Facebook Messenger Connections")}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {translations("Connect Facebook Pages (Messenger) to your WhatsApp channels")}
        </p>
      </div>
      <div className="grid gap-4">
        {waSettings.map((setting) => {
          const isConnected = Boolean(setting.fbPageId?.length);

          return (
            <Card
              key={setting.id || setting.phoneId}
              className="border-border/80 hover:border-border/90 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <CardTitle className="text-base">
                        {setting.phoneDisplayName || setting.phone}
                      </CardTitle>
                      <Badge
                        variant={isConnected ? "default" : "secondary"}
                        className={`text-[10px] ${
                          isConnected ? "bg-blue-600 hover:bg-blue-700" : ""
                        }`}
                      >
                        {isConnected ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {translations("WhatsApp channel")} - {setting.wabaId}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openFacebookModal(setting)}
                      className="gap-2"
                    >
                      <IconBrandFacebook size={16} />
                      {isConnected
                        ? translations("Change Facebook Page")
                        : translations("Connect Facebook Page")}
                    </Button>
                    {isConnected && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={upsertMutation.isPending}
                        onClick={() => handleDisconnectFacebook(setting)}
                      >
                        {translations("Disconnect")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isConnected && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">
                            {translations("Facebook Page Name")}
                          </p>
                          <p className="text-sm font-medium">{setting.fbUserName}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <FacebookConfigModal
        opened={openedFacebookModal}
        close={() => setOpenedFacebookModal(false)}
        selectedWaSettings={selectedWaSettings}
      />
    </div>
  );
}
