import { IconBrandFacebook } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import { FacebookConnectionsList } from "./facebook-connection-list.tsx";

export function FacebookSettingsDetail({
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
      <div className="space-y-4 p-4">
        <Skeleton className="h-2 w-1/2" />

        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-8 w-[300px]" />
          <Skeleton className="h-8 w-[300px]" />
        </div>
      </div>
    );
  } else if (waSettings?.length) {
    content = <FacebookConnectionsList waSettings={waSettings} />;
  } else {
    content = (
      <Alert>
        <AlertDescription>
          {translations(
            "Connect at least one WhatsApp Business account first to enable Facebook Messenger connection.",
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <IconBrandFacebook className="h-5 w-5 text-blue-600" />

        <h3 className="text-lg font-semibold">{translations("Facebook Messenger Settings")}</h3>
      </div>

      {content}
    </div>
  );
}
