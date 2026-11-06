import { IconBrandWhatsapp } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";

import { StepIconChip } from "../onboarding/StepChrome.tsx";

/**
 * Stands in for the QR card until a WhatsApp number is connected. The QR is a `wa.me`
 * link, so without a number there is nothing honest to print. Shared by the wizard's
 * Launch step and the Materials page.
 */
export function ConnectWhatsappCard({ joinKeyword }: Readonly<{ joinKeyword: string }>) {
  const { t } = useTranslation();
  return (
    <Card className="border-border">
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <StepIconChip tone="green" className="size-12 [&>svg]:size-6">
          <IconBrandWhatsapp />
        </StepIconChip>
        <p className="font-medium text-foreground">{t("Connect WhatsApp to get your join QR")}</p>
        <p className="max-w-[44ch] text-sm text-muted-foreground">
          {t(
            "The QR opens a WhatsApp chat with “{keyword}” ready to send. It can only be made once a number is connected.",
            { keyword: joinKeyword },
          )}
        </p>
        <Button render={<Link to="/dashboard/settings/channels" />}>
          <IconBrandWhatsapp size={16} />
          {t("Connect WhatsApp")}
        </Button>
      </CardContent>
    </Card>
  );
}
