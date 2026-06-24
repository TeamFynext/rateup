import { IconBrandInstagram } from "@tabler/icons-react";
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

import { InstagramConfigModal } from "./instagram-config-modal.tsx";

type WaSetting = WaSettings[number];

export function InstagramConnectionsList({
  waSettings,
}: Readonly<{
  waSettings: WaSettings | undefined;
}>) {
  const { t: translations } = useTranslation();
  const [selectedWaSettings, setSelectedWaSettings] = useState<WaSetting | null>(null);
  const [openedInstaConfigModal, setOpenedInstaConfigModal] = useState(false);
  const upsertMutation = useUpsertWaSettingsMutation();

  const openConnectModal = (setting: WaSetting) => {
    setSelectedWaSettings(setting);
    setOpenedInstaConfigModal(true);
  };

  const disconnectInstagram = (setting: WaSetting) => {
    const { ...rest } = setting;
    upsertMutation.mutate({
      ...rest,
      ibaId: "",
      igUserName: "",
      igDisplayName: "",
    });
  };

  if (!waSettings?.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{translations("Instagram Connections")}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {translations("Connect Instagram accounts to your WhatsApp channels")}
        </p>
      </div>

      <div className="grid gap-4">
        {waSettings.map((setting) => {
          const isConnected = Boolean(setting.ibaId?.length);

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
                          isConnected ? "bg-pink-600 hover:bg-pink-700" : ""
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
                      onClick={() => openConnectModal(setting)}
                      className="gap-2"
                    >
                      <IconBrandInstagram size={16} />
                      {isConnected
                        ? translations("Change Instagram")
                        : translations("Connect Instagram")}
                    </Button>
                    {isConnected && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={upsertMutation.isPending}
                        onClick={() => disconnectInstagram(setting)}
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
                            {translations("Instagram Username")}
                          </p>
                          <p className="text-sm font-medium">@{setting.igUserName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">
                            {translations("Instagram Display Name")}
                          </p>
                          <p className="text-sm font-medium">{setting.igDisplayName}</p>
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

      <InstagramConfigModal
        opened={openedInstaConfigModal}
        close={() => setOpenedInstaConfigModal(false)}
        selectedWaSettings={selectedWaSettings}
      />
    </div>
  );
}
