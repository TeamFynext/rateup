import { IconShieldCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { CampaignRetryStrategy, CampaignType } from "@/types/enums.ts";
import type { Campaign, CampaignRetryPolicy } from "@/types/global";

/**
 * How the campaign was set up, as a plain list.
 *
 * The Overview tab otherwise shows only outcomes; this is the "what did we
 * actually send, to whom, under what rules" that every question about a
 * surprising outcome starts from.
 */
export function CampaignSetupCard({
  campaign,
  recipients,
  policy,
}: Readonly<{
  campaign: Campaign;
  recipients: number;
  policy: CampaignRetryPolicy | null | undefined;
}>) {
  const { t } = useTranslation("campaign.details");

  const retries = policy?.enabled
    ? t("{strategy} · up to {count}", {
        strategy: policy.strategy === CampaignRetryStrategy.SMART ? t("Smart") : t("Every 24h"),
        count: policy.maxAttempts,
      })
    : t("Off");

  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl px-5 py-4.5 shadow-xs ring-1">
      <span className="font-display text-[15px] font-semibold">{t("Setup")}</span>
      <div className="flex flex-col gap-2.5 text-[13px]">
        <Row
          label={t("Type")}
          value={campaign.type === CampaignType.DRIP ? t("Drip") : t("Broadcast")}
        />
        <Row label={t("Team")} value={campaign.teamName ?? "—"} />
        <Row label={t("Audience")} value={t("{count} recipients", { count: recipients })} />
        <Row
          label={t("Sent")}
          value={
            campaign.campaignSentAt
              ? new Date(campaign.campaignSentAt).toLocaleString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : campaign.startedAt
                ? new Date(campaign.startedAt).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : t("Not yet")
          }
        />
        {campaign.type === CampaignType.DRIP ? null : <Row label={t("Retries")} value={retries} />}
        <Row
          label={t("Opt-in filter")}
          value={campaign.useUserConsent ? t("On") : t("Off")}
          icon={
            campaign.useUserConsent ? (
              <IconShieldCheck
                className="size-3.5 text-green-600 dark:text-green-500"
                aria-hidden
              />
            ) : null
          }
        />
        {campaign.timezone && campaign.timezone !== "Etc/UTC" ? (
          <Row label={t("Timezone")} value={campaign.timezone} />
        ) : null}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  icon,
}: Readonly<{ label: string; value: string; icon?: React.ReactNode }>) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="inline-flex items-center gap-1 text-right font-medium">
        {icon}
        {value}
      </span>
    </div>
  );
}
