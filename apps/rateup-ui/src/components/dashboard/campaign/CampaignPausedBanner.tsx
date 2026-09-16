import { IconAlertTriangle, IconArrowUpRight, IconPlayerPlay } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { META_BILLING_URL } from "@/components/dashboard/setup/setup.tasks.ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CampaignPauseReason, CampaignStatus } from "@/types/enums.ts";

/**
 * Why the platform stopped a campaign, and the one thing that fixes it.
 *
 * Shown only for PAUSED — a campaign the *account* could not send, not one its
 * owner paused or one that fell over. The badge's hover card carries the same
 * reason in a sentence; this is the version nobody has to hover to find, with
 * the fix a click away, because a paused campaign sits silently until someone
 * acts on it.
 */
export function CampaignPausedBanner({
  status,
  pauseReason,
  errorMessage,
  pendingCount,
  canResume,
  isResuming,
  onResume,
}: Readonly<{
  status: CampaignStatus;
  pauseReason?: CampaignPauseReason | null;
  errorMessage?: string | null;
  /** Recipients not messaged yet — who a resume sends to. */
  pendingCount: number;
  canResume: boolean;
  isResuming: boolean;
  onResume: () => void;
}>) {
  const { t } = useTranslation("campaign.details");
  if (status !== CampaignStatus.PAUSED) return null;

  const copy =
    pauseReason === CampaignPauseReason.CONVERSATION_LIMIT
      ? {
          title: t("Campaign paused: conversation limit reached"),
          body: t(
            "Your plan's conversation allowance is used up, so sending stopped. Upgrade your plan or wait for the allowance to reset, then resume.",
          ),
        }
      : pauseReason === CampaignPauseReason.PAYMENT_METHOD
        ? {
            title: t("Campaign paused: WhatsApp payment issue"),
            body: t(
              "Meta rejected the payment method on your WhatsApp Business account, so sending stopped. Add or fix the payment method in Meta's billing settings, then resume.",
            ),
          }
        : {
            title: t("Campaign paused"),
            body: errorMessage ?? t("Sending stopped because the account cannot send right now."),
          };

  return (
    <Alert variant="destructive">
      <IconAlertTriangle aria-hidden />
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>
          {copy.body}{" "}
          {pendingCount > 0
            ? t("{count} recipients have not been messaged yet and will be sent when you resume.", {
                count: pendingCount.toLocaleString(),
              })
            : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {pauseReason === CampaignPauseReason.CONVERSATION_LIMIT ? (
            <Button
              size="sm"
              variant="destructive"
              nativeButton={false}
              render={<Link to="/dashboard/settings/billing" />}
            >
              {t("Upgrade plan")}
              <IconArrowUpRight className="size-3.5" aria-hidden />
            </Button>
          ) : null}
          {pauseReason === CampaignPauseReason.PAYMENT_METHOD ? (
            <Button
              size="sm"
              variant="destructive"
              nativeButton={false}
              render={<a href={META_BILLING_URL} target="_blank" rel="noopener noreferrer" />}
            >
              {t("Open Meta billing")}
              <IconArrowUpRight className="size-3.5" aria-hidden />
            </Button>
          ) : null}
          {canResume ? (
            <Button size="sm" variant="outline" disabled={isResuming} onClick={onResume}>
              <IconPlayerPlay className="size-3.5" aria-hidden />
              {t("Resume")}
            </Button>
          ) : null}
        </div>
      </AlertDescription>
    </Alert>
  );
}
