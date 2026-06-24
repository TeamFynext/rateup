"use client";

import { useState } from "react";

import { Group, Skeleton, Stack, Tooltip } from "@mantine/core";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { WaConfigType } from "@/types/enums.ts";
import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";

import { MetaLoginStatus } from "./meta-login-status.tsx";
import { WhatsAppManualConfiguration } from "./whatsapp-manual-configuration.tsx";

export function WhatsAppSettingsDetail({
  waSettings,
  isLoading,
}: Readonly<{
  waSettings: WaSettings | undefined;
  isLoading: boolean;
}>) {
  const [tab, setTab] = useState<string>(
    waSettings?.[0]?.type ?? WaConfigType.Automated,
  );
  const { t: translations } = useTranslation();

  const isAutomated = waSettings?.[0]?.type === WaConfigType.Automated;
  const isManual = waSettings?.[0]?.type === WaConfigType.Manual;

  return (
    <div className="space-y-4 rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <IconBrandWhatsapp className="h-5 w-5 text-green-500" />
        <h3 className="text-lg font-semibold">WhatsApp Settings</h3>
      </div>
      {isLoading ? (
        <Stack p="md">
          <Skeleton height={8} width="50%" />
          <Group>
            <Skeleton height={30} width={300} />
            <Skeleton height={30} width={300} />
          </Group>
        </Stack>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <Tooltip
              label={
                isManual
                  ? translations(
                      "You need to delete the manually configured details to switch to Automated Configuration",
                    )
                  : translations("Automated Configuration")
              }
              openDelay={300}
            >
              <TabsTrigger value={WaConfigType.Automated} disabled={isManual}>
                {translations("Automated")}
              </TabsTrigger>
            </Tooltip>
            <Tooltip
              label={
                isAutomated
                  ? translations(
                      "You need to de-register from the automated onboarding through fb-login to switch to manual configuration",
                    )
                  : translations("Manually Configure WhatsApp Business Account")
              }
              openDelay={300}
            >
              <TabsTrigger value={WaConfigType.Manual} disabled={isAutomated}>
                {translations("Manual")}
              </TabsTrigger>
            </Tooltip>
          </TabsList>

          <TabsContent value={WaConfigType.Automated}>
            <MetaLoginStatus waSettings={waSettings} />
          </TabsContent>

          <TabsContent value={WaConfigType.Manual}>
            {waSettings?.length ? (
              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                {waSettings.map((setting) => (
                  <WhatsAppManualConfiguration
                    key={setting.id || setting.phoneId}
                    waSettings={setting}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <WhatsAppManualConfiguration waSettings={undefined} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
