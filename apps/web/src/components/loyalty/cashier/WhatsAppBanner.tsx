import { IconBrandWhatsapp } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";

import { LOYALTY_PATHS } from "../../dashboard/loyalty/paths.ts";

/** Points still work without WhatsApp; the customer just is not told. Say so, once, at the top. */
export function WhatsAppBanner({
  pointsName,
  standalone,
}: Readonly<{ pointsName: string; standalone: boolean }>) {
  const { t } = useTranslation();
  return (
    <Alert>
      <IconBrandWhatsapp />
      <AlertTitle>{t("WhatsApp is not connected")}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>
          {t(
            "{points} still work — customers just won't be told about them until a channel is connected in Settings.",
            { points: pointsName },
          )}
        </span>
        {!standalone && (
          <Button size="sm" variant="outline" render={<Link to={LOYALTY_PATHS.settings} />}>
            {t("Connect WhatsApp in Settings")}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
