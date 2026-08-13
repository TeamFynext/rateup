import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import { WaBusinessProfileForm } from "./wa-business-profile-form.tsx";
import { WaChannelNameForm } from "./wa-channel-name-form.tsx";
import { WaDisplayNamePanel } from "./wa-display-name-panel.tsx";

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
