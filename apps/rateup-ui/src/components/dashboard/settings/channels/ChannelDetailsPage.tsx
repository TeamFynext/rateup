import { IconArrowLeft } from "@tabler/icons-react";
import { Link, useParams } from "@tanstack/react-router";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button.tsx";

import { FacebookSettingsDetail } from "./components/facebook-settings-detail";
import { InstagramSettingsDetail } from "./components/instagram-settings-detail";
import { WhatsAppSettingsDetail } from "./components/whatsapp-settings-detail";

export function ChannelDetailsPage() {
  const params = useParams({
    strict: false,
  });
  const channel = params?.channel;
  const { data: waSettings, isLoading } = useWaSettings();

  const isWhatsapp = channel === "whatsapp";
  const isInstagram = channel === "instagram";
  const isFacebook = channel === "facebook";

  if (!isWhatsapp && !isInstagram && !isFacebook) {
    return (
      <div className="space-y-4 rounded-xl border bg-background p-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-semibold">Channel not found</h3>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/settings/channels">
              <IconArrowLeft className="mr-2 h-4 w-4" />
              Back to channels
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Channel Details</h2>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard/settings/channels">
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Back to channels
          </Link>
        </Button>
      </div>

      {isWhatsapp && <WhatsAppSettingsDetail waSettings={waSettings} isLoading={isLoading} />}
      {isInstagram && <InstagramSettingsDetail waSettings={waSettings} isLoading={isLoading} />}

      {isFacebook && <FacebookSettingsDetail waSettings={waSettings} isLoading={isLoading} />}
    </div>
  );
}
