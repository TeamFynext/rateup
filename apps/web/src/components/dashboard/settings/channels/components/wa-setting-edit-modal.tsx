import { Button } from "@rateup/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rateup/ui/components/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rateup/ui/components/tabs";
import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { WaConfigType } from "@/types/enums.ts";

import { WaBusinessProfileForm } from "./wa-business-profile-form.tsx";
import { WaCallingPanel } from "./wa-calling-panel.tsx";
import { WaChannelNameForm } from "./wa-channel-name-form.tsx";
import { WaDisplayNamePanel } from "./wa-display-name-panel.tsx";
import { WaManualCredentialsForm } from "./whatsapp-manual-configuration.tsx";

type WaSetting = WaSettings[number];

export const WaSettingEditModal = ({
  opened,
  close,
  waSetting,
}: Readonly<{
  opened: boolean;
  close: () => void;
  waSetting: WaSetting | null;
}>) => {
  const { t: translations } = useTranslation();

  if (!waSetting) return null;
  // Added by hand rather than through Meta, so its IDs and token are ours to edit.
  const isManual = waSetting.type === WaConfigType.Manual;

  return (
    <Dialog open={opened} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{translations("Edit channel")}</DialogTitle>
          <DialogDescription>{waSetting.phone}</DialogDescription>
        </DialogHeader>

        {/* Keyed so switching accounts starts every tab fresh rather than reusing the last one. */}
        <Tabs key={waSetting.id} defaultValue="channel">
          <TabsList>
            <TabsTrigger value="channel">{translations("Channel")}</TabsTrigger>
            <TabsTrigger value="display-name">{translations("Display name")}</TabsTrigger>
            <TabsTrigger value="profile">{translations("Profile")}</TabsTrigger>
            <TabsTrigger value="calling">{translations("Calling")}</TabsTrigger>
            {isManual && (
              <TabsTrigger value="credentials">{translations("Credentials")}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="channel" className="mt-4">
            <WaChannelNameForm settingId={waSetting.id} channelName={waSetting.phoneDisplayName} />
          </TabsContent>

          <TabsContent value="display-name" className="mt-4">
            <p className="mb-4 text-xs text-muted-foreground">
              {translations(
                "Shown to customers in WhatsApp. Changes go to Meta for review and apply once approved.",
              )}
            </p>
            <WaDisplayNamePanel phoneId={waSetting.phoneId} enabled={opened} />
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <p className="mb-4 text-xs text-muted-foreground">
              {translations(
                "The photo and details customers see when they open your business in WhatsApp.",
              )}
            </p>
            <WaBusinessProfileForm phoneId={waSetting.phoneId} enabled={opened} />
          </TabsContent>

          <TabsContent value="calling" className="mt-4">
            <WaCallingPanel phoneId={waSetting.phoneId} enabled={opened} />
          </TabsContent>

          {isManual && (
            <TabsContent value="credentials" className="mt-4">
              <p className="mb-4 text-xs text-muted-foreground">
                {translations(
                  "The Meta IDs and access token this number was added with. Saving replaces them.",
                )}
              </p>
              <WaManualCredentialsForm waSettings={waSetting} />
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={close}>
            {translations("Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
