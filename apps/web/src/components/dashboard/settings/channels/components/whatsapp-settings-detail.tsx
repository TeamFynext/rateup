import { Skeleton } from "@rateup/ui/components/skeleton";
import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { SectionHeading } from "@/components/common/page-heading.tsx";

import { MetaLoginStatus } from "./meta-login-status.tsx";

/**
 * Every WhatsApp number the org has connected, in one list. A number is connected through
 * Meta (automated) or added by hand with its IDs and token (manual); both kinds live side
 * by side, each row saying which it is.
 */
export function WhatsAppSettingsDetail({
  waSettings,
  isLoading,
}: Readonly<{
  waSettings: WaSettings | undefined;
  isLoading: boolean;
}>) {
  const { t: translations } = useTranslation();

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        title={translations("Connected accounts")}
        hint={translations("Onboard through Meta, or configure a number by hand")}
      />
      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : (
        <MetaLoginStatus waSettings={waSettings} />
      )}
    </section>
  );
}
