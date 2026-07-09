import { IconBrandInstagram } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import { InstagramConnectionsList } from "./instagram-connections-list.tsx";

export function InstagramSettingsDetail({
  waSettings,
  isLoading,
}: Readonly<{
  waSettings: WaSettings | undefined;
  isLoading: boolean;
}>) {
  const { t: translations } = useTranslation();

  let content: ReactNode;

  if (isLoading) {
    content = (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-2 w-1/2" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-7.5 w-75" />
          <Skeleton className="h-7.5 w-75" />
        </div>
      </div>
    );
  } else if (waSettings?.length) {
    content = <InstagramConnectionsList waSettings={waSettings} />;
  } else {
    content = (
      <Alert>
        <AlertDescription>
          {translations(
            "Connect at least one WhatsApp Business account first to enable Instagram connection.",
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <IconBrandInstagram className="h-5 w-5 text-pink-600" />
        <h3 className="text-lg font-semibold">{translations("Instagram Settings")}</h3>
      </div>

      {content}
    </div>
  );
}
