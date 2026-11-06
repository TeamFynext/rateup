import { Alert, AlertDescription, AlertTitle } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { IconChartBar } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useEnableTemplateInsights } from "@/backend/whatsapp/templateAnalytics.query";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

/**
 * Asks an admin to opt a WhatsApp account in to Meta's template analytics.
 * Meta never lets it be switched off again, so the confirm says so.
 */
export function EnableTemplateAnalytics({
  phoneId,
  accountName,
}: Readonly<{ phoneId: string; accountName?: string | null }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const canEnable = useCan("channels.manage");
  const enable = useEnableTemplateInsights();

  async function handleEnable() {
    const ok = await confirm({
      title: t("Turn on template analytics?"),
      description: t(
        "Meta will start counting sends, reads, button clicks and cost for every template on this WhatsApp account. It also turns on click tracking for website buttons. Meta does not allow this to be turned off again.",
      ),
      confirmText: t("Turn on"),
    });
    if (!ok) return;
    enable.mutate(phoneId, {
      onSuccess: () => toast.success(t("Template analytics are on")),
      onError: (error) =>
        toast.error(getApiErrorMessage(error, t("Couldn't turn on template analytics"))),
    });
  }

  return (
    <Alert>
      <IconChartBar className="size-4" />
      <AlertTitle>
        {accountName
          ? t("See how templates on {account} perform", { account: accountName })
          : t("See how your templates perform")}
      </AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>
          {canEnable
            ? t("Turn on Meta's template analytics to see reads, button clicks and cost.")
            : t("Ask an admin to turn on template analytics for this WhatsApp number.")}
        </span>
        {canEnable && (
          <Button size="sm" onClick={handleEnable} loading={enable.isPending}>
            {t("Turn on analytics")}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
