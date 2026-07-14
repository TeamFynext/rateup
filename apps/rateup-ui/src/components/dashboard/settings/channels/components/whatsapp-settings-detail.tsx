import { IconBrandWhatsapp, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { WaConfigType } from "@/types/enums.ts";

import { MetaLoginStatus } from "./meta-login-status.tsx";
import { WhatsAppManualConfiguration } from "./whatsapp-manual-configuration.tsx";

export function WhatsAppSettingsDetail({
  waSettings,
  isLoading,
}: Readonly<{
  waSettings: WaSettings | undefined;
  isLoading: boolean;
}>) {
  const [tab, setTab] = useState<string>(waSettings?.[0]?.type ?? WaConfigType.Automated);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
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
        <div className="flex flex-col gap-4 p-4">
          <Skeleton className="h-2 w-1/2" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-7.5 w-75" />
            <Skeleton className="h-7.5 w-75" />
          </div>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TooltipProvider delay={300}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <TabsTrigger value={WaConfigType.Automated} disabled={isManual}>
                      {translations("Automated")}
                    </TabsTrigger>
                  }
                />
                <TooltipContent>
                  {isManual
                    ? translations(
                        "You need to delete the manually configured details to switch to Automated Configuration",
                      )
                    : translations("Automated Configuration")}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <TabsTrigger value={WaConfigType.Manual} disabled={isAutomated}>
                      {translations("Manual")}
                    </TabsTrigger>
                  }
                />
                <TooltipContent>
                  {isAutomated
                    ? translations(
                        "You need to de-register from the automated onboarding through fb-login to switch to manual configuration",
                      )
                    : translations("Manually Configure WhatsApp Business Account")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TabsList>

          <TabsContent value={WaConfigType.Automated}>
            <MetaLoginStatus waSettings={waSettings} />
          </TabsContent>

          <TabsContent value={WaConfigType.Manual}>
            <div className="mt-4 space-y-4">
              {waSettings?.length ? (
                <div className="flex justify-end">
                  <Button type="button" onClick={() => setIsAddingAccount(true)}>
                    <IconPlus size={18} className="mr-2" />
                    {translations("Add Account")}
                  </Button>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {waSettings?.map((setting) => (
                  <WhatsAppManualConfiguration
                    key={setting.id || setting.phoneId}
                    waSettings={setting}
                  />
                ))}

                {(!waSettings?.length || isAddingAccount) && (
                  <WhatsAppManualConfiguration
                    waSettings={undefined}
                    onCancel={waSettings?.length ? () => setIsAddingAccount(false) : undefined}
                    onSaved={() => setIsAddingAccount(false)}
                  />
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
