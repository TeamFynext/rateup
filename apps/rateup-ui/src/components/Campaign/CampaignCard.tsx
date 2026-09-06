import {
  IconArrowRight,
  IconCircleCheck,
  IconCircleDashed,
  IconDotsVertical,
  IconFileText,
  IconEye,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useDeleteCampaignMutation } from "@/backend/campaign/campaign.query";
import { CampaignStatusBadge } from "@/components/dashboard/campaign/campaignStatus.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { CampaignStatus, CampaignType } from "@/types/enums.ts";
import type { Campaign } from "@/types/global";

interface CampaignCardProps {
  readonly campaign: Campaign;
  readonly onView: (campaign: Campaign) => void;
  readonly onEdit: (campaign: Campaign) => void;
}

export default function CampaignCard(props: Readonly<CampaignCardProps>) {
  const { campaign, onView, onEdit } = props;
  const { t } = useTranslation("campaign.card");
  const confirm = useConfirm();
  const deleteCampaignMutation = useDeleteCampaignMutation(campaign.teamId, campaign.type);
  const handleDelete = async () => {
    const shouldDelete = await confirm({
      title: t("Delete Campaign"),
      description: t('Are you sure you want to delete "{name}"? This action cannot be undone.', {
        name: campaign.name,
      }),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });

    if (!shouldDelete) return;

    try {
      await deleteCampaignMutation.mutateAsync(campaign.id);
      toast.success(t("Campaign deleted successfully"));
    } catch {
      toast.error(t("Failed to delete campaign"));
    }
  };

  const actions = (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(event) => event.stopPropagation()}
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          />
        }
      >
        <IconDotsVertical className="h-4 w-4" />
      </DropdownMenuTrigger>

      {/* Sized to its content: the popup defaults to `w-(--anchor-width)`, and the anchor is a
          32px icon button, so labels like "View Details" wrapped onto two lines. */}
      <DropdownMenuContent
        align="end"
        className="w-auto min-w-40"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            // A draft has no results to view — the useful thing to do with one
            // is finish it, so its primary action is the wizard.
            if (campaign.status === CampaignStatus.DRAFT) onEdit(campaign);
            else onView(campaign);
          }}
        >
          <IconEye className="mr-2 h-4 w-4" />
          {campaign.status === CampaignStatus.DRAFT ? t("Continue setup") : t("View Details")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onEdit(campaign);
          }}
        >
          <IconPencil className="mr-2 h-4 w-4" />
          {t("Edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={(event) => {
            event.stopPropagation();
            handleDelete();
          }}
        >
          <IconTrash className="mr-2 h-4 w-4" />
          {t("Delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // A draft is a different object from a campaign: it has no results, no
  // status to toggle, and exactly one useful action. Giving it the live card's
  // chrome — a switch, a delivered count of zero — describes something that has
  // not happened yet as though it went badly.
  if (campaign.status === CampaignStatus.DRAFT) {
    return <DraftCampaignCard campaign={campaign} onEdit={onEdit} actions={actions} />;
  }

  return <LiveCampaignCard campaign={campaign} onView={onView} actions={actions} />;
}

/**
 * A campaign that has been launched.
 *
 * The card answers the two questions someone scanning the list has: how big was
 * it, and how much of it landed. The bar is delivered-then-read stacked against
 * the recipient count, so a campaign that half-delivered reads as half a bar
 * rather than as a number they have to divide in their head.
 */
function LiveCampaignCard({
  campaign,
  onView,
  actions,
}: Readonly<{
  campaign: Campaign;
  onView: (campaign: Campaign) => void;
  actions: React.ReactNode;
}>) {
  const { t } = useTranslation("campaign.card");

  const recipients = campaign.campaignParticipantsCount ?? 0;
  const delivered = campaign.totalDelivered ?? 0;
  const read = campaign.totalRead ?? 0;
  const share = (value: number) => (recipients > 0 ? Math.min((value / recipients) * 100, 100) : 0);
  // Read is a subset of delivered, so the segments are drawn as read plus the
  // rest of delivered — not stacked totals, which would overflow the bar.
  const readWidth = share(read);
  const deliveredWidth = Math.max(share(delivered) - readWidth, 0);

  const lastActivity = campaign.campaignSentAt ?? campaign.startedAt ?? campaign.createdAt;

  return (
    <div
      onClick={() => onView(campaign)}
      className="bg-card ring-foreground/10 flex cursor-pointer flex-col gap-3 rounded-xl p-5 shadow-xs ring-1 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-display truncate text-[15px] font-semibold">{campaign.name}</span>
          <CampaignStatusBadge status={campaign.status} errorMessage={campaign.errorMessage} />
        </div>
        {actions}
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
            </strong>{" "}
            {t("recipients")}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {recipients > 0
              ? t("{delivered}% delivered · {read}% read", {
                  delivered: share(delivered).toFixed(0),
                  read: readWidth.toFixed(0),
                })
              : t("Not sent yet")}
          </span>
        </div>
        <span className="bg-secondary flex h-1.5 overflow-hidden rounded-full">
          <span className="bg-emerald-500 block h-full" style={{ width: `${readWidth}%` }} />
          <span className="bg-green-600 block h-full" style={{ width: `${deliveredWidth}%` }} />
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
  actions,
}: Readonly<{
  campaign: Campaign;
  onEdit: (campaign: Campaign) => void;
  actions: React.ReactNode;
}>) {
  const { t } = useTranslation("campaign.card");

  return (
    <div
      onClick={() => onEdit(campaign)}
      className="border-input bg-card hover:border-primary/40 flex cursor-pointer flex-col gap-3 rounded-xl border border-dashed p-5 transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-display truncate text-[15px] font-semibold">{campaign.name}</span>
          <Badge variant="outline" className="shrink-0">
            {t("Draft")}
          </Badge>
        </div>
        {actions}
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
