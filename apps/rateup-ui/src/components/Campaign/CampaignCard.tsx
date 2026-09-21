import {
  IconArrowRight,
  IconCircleCheck,
  IconCircleDashed,
  IconFileText,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  campaignProgressSegments,
  PROGRESS_SEGMENTS,
} from "@/components/Campaign/campaignProgress.ts";
import { pressable } from "@/components/common/pressable.ts";
import { CampaignStatusBadge } from "@/components/dashboard/campaign/campaignStatus.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CampaignStatus, CampaignType } from "@/types/enums.ts";
import type { Campaign } from "@/types/global";

interface CampaignCardProps {
  readonly campaign: Campaign;
  readonly onView: (campaign: Campaign) => void;
  readonly onEdit: (campaign: Campaign) => void;
}

/**
 * The card carries no menu of its own.
 *
 * It used to open a three-dot dropdown holding View / Edit / Delete — three
 * copies of decisions the card already makes by being clicked (a live campaign
 * opens its page, a draft opens the wizard), plus a destructive one sitting a
 * pixel away from them in a grid of cards. Editing and deleting live on the
 * campaign's own page, where the campaign you are acting on is unambiguous.
 */
export default function CampaignCard(props: Readonly<CampaignCardProps>) {
  const { campaign, onView, onEdit } = props;

  // A draft is a different object from a campaign: it has no results, no
  // status to toggle, and exactly one useful action. Giving it the live card's
  // chrome — a switch, a delivered count of zero — describes something that has
  // not happened yet as though it went badly.
  if (campaign.status === CampaignStatus.DRAFT) {
    return <DraftCampaignCard campaign={campaign} onEdit={onEdit} />;
  }

  return <LiveCampaignCard campaign={campaign} onView={onView} />;
}

/**
 * A campaign that has been launched.
 *
 * The card answers the two questions someone scanning the list has: how big was
 * it, and how much of it landed. The bar stacks read, delivered, still-in-flight
 * and failed against the recipient count, each in its own colour, so a campaign
 * that half-delivered reads as half a bar and one that mostly failed reads as
 * red — without dividing anything in your head. See `campaignProgress.ts` for
 * how the overlapping counters become separate segments.
 */
function LiveCampaignCard({
  campaign,
  onView,
}: Readonly<{
  campaign: Campaign;
  onView: (campaign: Campaign) => void;
}>) {
  const { t } = useTranslation("campaign.card");

  const recipients = campaign.campaignParticipantsCount ?? 0;
  const delivered = campaign.totalDelivered ?? 0;
  const read = campaign.totalRead ?? 0;
  const share = (value: number) => (recipients > 0 ? Math.min((value / recipients) * 100, 100) : 0);
  const segments = campaignProgressSegments({
    recipients,
    // Recipients dispatched, i.e. everyone no longer waiting on a first attempt.
    // `totalSent` counts messages and double-counts anyone a retry recovered.
    dispatched: recipients - (campaign.activePending ?? 0),
    delivered,
    read,
    failed: campaign.activeFailed ?? campaign.totalFailed,
  });

  const lastActivity = campaign.campaignSentAt ?? campaign.startedAt ?? campaign.createdAt;

  return (
    <div
      {...pressable(() => onView(campaign), campaign.name)}
      className="bg-card ring-foreground/10 flex cursor-pointer flex-col gap-3 rounded-xl p-5 shadow-xs ring-1 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Status sits at the end of the title line, where the eye lands last and
          where every card puts it — so a column of cards reads as a column of
          statuses rather than as badges scattered at the end of each name. */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-display truncate text-[15px] font-semibold">{campaign.name}</span>
        <CampaignStatusBadge status={campaign.status} errorMessage={campaign.errorMessage} />
      </div>

      {campaign.templateName ? (
        <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs">
          <IconFileText className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate font-mono">{campaign.templateName}</span>
        </span>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
          <span className="text-secondary-foreground">
            <strong className="text-foreground font-semibold tabular-nums">
              {recipients.toLocaleString()}
            </strong>
            {""}
            {t("recipients")}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {recipients > 0
              ? t("{delivered}% delivered · {read}% read", {
                  delivered: share(delivered).toFixed(0),
                  read: share(read).toFixed(0),
                })
              : t("Not sent yet")}
          </span>
        </div>
        <span
          className="bg-secondary flex h-1.5 overflow-hidden rounded-full"
          role="img"
          aria-label={segments
            .map((segment) => `${t(segment.label)} ${segment.count.toLocaleString()}`)
            .join(", ")}
        >
          {segments.map((segment) =>
            segment.width > 0 ? (
              <span
                key={segment.key}
                className={`block h-full ${segment.color}`}
                // Width is data, so it is the one inline style here.
                style={{ width: `${segment.width}%` }}
                title={`${t(segment.label)}: ${segment.count.toLocaleString()}`}
              />
            ) : null,
          )}
        </span>
      </div>

      <div className="border-border text-muted-foreground/70 flex items-center justify-between gap-3 border-t pt-3 text-xs">
        <span>
          {new Date(lastActivity).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          })}
        </span>
        {campaign.teamName ? <span className="truncate">{campaign.teamName}</span> : null}
      </div>
    </div>
  );
}

/**
 * The key to the progress bar's colours.
 *
 * Shown once, above the grid, rather than on every card: the colours mean the
 * same thing on all of them, and repeating the key with four counts per card
 * turned a glanceable bar back into numbers to read. The counts are still on
 * each segment's hover.
 */
export function CampaignProgressLegend({ className = "" }: Readonly<{ className?: string }>) {
  const { t } = useTranslation("campaign.card");
  return (
    <span
      className={`text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${className}`}
    >
      {PROGRESS_SEGMENTS.map((segment) => (
        <span key={segment.key} className="inline-flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${segment.color}`} aria-hidden />
          {t(segment.label)}
        </span>
      ))}
    </span>
  );
}

/** What a draft still needs before it can be launched. */
function draftChecklist(campaign: Campaign) {
  const hasTemplate =
    campaign.type === CampaignType.DRIP
      ? Boolean(campaign.dripStages?.length)
      : Boolean(campaign.waTemplateId);
  return [
    { done: hasTemplate, label: hasTemplate ? "Template set" : "Template not set" },
    {
      done: (campaign.campaignParticipantsCount ?? 0) > 0,
      label:
        (campaign.campaignParticipantsCount ?? 0) > 0
          ? `${campaign.campaignParticipantsCount?.toLocaleString()} recipients`
          : "No recipients yet",
    },
    {
      done: true,
      label: `${campaign.type === CampaignType.DRIP ? "Drip" : "Broadcast"}${
        campaign.teamName ? ` · ${campaign.teamName}` : ""
      }`,
    },
  ];
}

function DraftCampaignCard({
  campaign,
  onEdit,
}: Readonly<{
  campaign: Campaign;
  onEdit: (campaign: Campaign) => void;
}>) {
  const { t } = useTranslation("campaign.card");

  return (
    <div
      {...pressable(() => onEdit(campaign), campaign.name)}
      className="border-input bg-card hover:border-primary/40 flex cursor-pointer flex-col gap-3 rounded-xl border border-dashed p-5 transition hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display truncate text-[15px] font-semibold">{campaign.name}</span>
        <Badge variant="outline" className="shrink-0">
          {t("Draft")}
        </Badge>
      </div>

      <div className="flex flex-col gap-1.5">
        {draftChecklist(campaign).map((item) => (
          <span
            key={item.label}
            className={
              item.done
                ? "text-secondary-foreground inline-flex items-center gap-2 text-[12.5px]"
                : "text-muted-foreground inline-flex items-center gap-2 text-[12.5px]"
            }
          >
            {item.done ? (
              <IconCircleCheck
                className="size-3.5 shrink-0 text-green-600 dark:text-green-500"
                aria-hidden
              />
            ) : (
              <IconCircleDashed className="size-3.5 shrink-0" aria-hidden />
            )}
            {t(item.label)}
          </span>
        ))}
      </div>

      <div className="border-border mt-1 flex items-center justify-between gap-3 border-t pt-3">
        <span className="text-muted-foreground/70 text-xs">
          {t("Created {date}", {
            date: new Date(campaign.createdAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
            }),
          })}
        </span>
        <Button
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(campaign);
          }}
        >
          {t("Continue setup")}
          <IconArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
