// Connect Instagram or Messenger wherever the button is dropped, rather than sending
// people to channel settings to do it. Both channels hang off a WhatsApp channel in
// Meta, so this picks that first — silently when there is only one, which is the
// case during setup — and then opens the same config modal the settings page uses.

import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";

import { FacebookConfigModal } from "./facebook-config-modal.tsx";
import { InstagramConfigModal } from "./instagram-config-modal.tsx";

type WaSetting = WaSettings[number];

export function ConnectChannelButton({
  platform,
  label,
  className,
  variant = "default",
}: Readonly<{
  platform: "instagram" | "facebook";
  label: string;
  className?: string;
  variant?: "default" | "secondary";
}>) {
  const { t: translations } = useTranslation();
  const { data: waSettings, isLoading } = useWaSettings();

  const [selected, setSelected] = useState<WaSetting | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const channels = waSettings ?? [];

  const openFor = (setting: WaSetting) => {
    setSelected(setting);
    setPickerOpen(false);
    setConfigOpen(true);
  };

  const start = () => {
    // One WhatsApp channel is the normal case during setup, and asking which one
    // when there is only one is a question with a single answer.
    if (channels.length === 1) {
      openFor(channels[0]);
      return;
    }
    setPickerOpen(true);
  };

  const ConfigModal = platform === "instagram" ? InstagramConfigModal : FacebookConfigModal;

  return (
    <>
      <Button
        variant={variant}
        className={className}
        disabled={isLoading || channels.length === 0}
        onClick={start}
      >
        {label}
      </Button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translations("Which WhatsApp channel?")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {channels.map((setting) => (
              <Button
                key={setting.id || setting.phoneId}
                variant="outline"
                className="h-auto justify-start py-2.5"
                onClick={() => openFor(setting)}
              >
                {setting.phoneDisplayName || setting.phone}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ConfigModal
        opened={configOpen}
        close={() => setConfigOpen(false)}
        selectedWaSettings={selected}
      />
    </>
  );
}
