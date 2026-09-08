import { IconAlertCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card.tsx";
import { CampaignStatus } from "@/types/enums.ts";

/**
 * How a campaign's state is written and coloured.
 *
 * The stored status names the machinery — a campaign is `QUEUING` while the
 * enqueue worker walks its participants, `DEQUEUING` while it unwinds them.
 * Nobody reading the list cares which worker is running; they care whether the
 * campaign is going out, stopped, or done. So the label is the state as the
 * sender experiences it, and the two transient worker states borrow the label
 * of the state they are heading into.
 *
 * `live` marks the states that are still moving, which is what earns the dot:
 * a finished or not-yet-started campaign gets a flat badge, so a dot in the
 * list always means "this is changing while you look at it".
 */
interface CampaignStatusMeta {
  label: string;
  badge: string;
  dot: string;
  live: boolean;
}

const NEUTRAL: CampaignStatusMeta = {
  label: "Draft",
  badge: "bg-muted text-muted-foreground",
  dot: "bg-muted-foreground/60",
  live: false,
};

const SENDING: CampaignStatusMeta = {
  label: "Sending",
  badge: "bg-primary/10 text-primary",
  dot: "bg-primary",
  live: true,
};

const PAUSED: CampaignStatusMeta = {
  label: "Paused",
  badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
  dot: "bg-amber-500",
  live: false,
};

const CAMPAIGN_STATUS_META: Record<CampaignStatus, CampaignStatusMeta> = {
  [CampaignStatus.DRAFT]: NEUTRAL,
  [CampaignStatus.SCHEDULED]: {
    label: "Scheduled",
    badge: "bg-secondary text-secondary-foreground",
    dot: "bg-muted-foreground",
    live: false,
  },
  [CampaignStatus.QUEUING]: SENDING,
  [CampaignStatus.ACTIVE]: SENDING,
  // Its own state, not a flavour of Sending: nothing is going out during a retry
  // window, which is usually hours long. The dot says it is still moving.
  [CampaignStatus.RETRYING]: {
    label: "Retrying",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400",
    dot: "bg-sky-500",
    live: true,
  },
  // Pausing is the mirror of queuing: the worker is still unwinding, so the
  // campaign is not yet stopped and the badge keeps its dot.
  [CampaignStatus.DEQUEUING]: { ...PAUSED, label: "Pausing", live: true },
  [CampaignStatus.INACTIVE]: PAUSED,
  [CampaignStatus.COMPLETED]: {
    label: "Completed",
    badge: "bg-green-600/10 text-green-700 dark:text-green-500",
    dot: "bg-green-600",
    live: false,
  },
  [CampaignStatus.FAILED]: {
    label: "Failed",
    badge: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
    live: false,
  },
};

export function campaignStatusMeta(status: CampaignStatus | string): CampaignStatusMeta {
  return CAMPAIGN_STATUS_META[status as CampaignStatus] ?? NEUTRAL;
}

/**
 * The states worth filtering by, in the order a campaign moves through them.
 *
 * A filter selects a label, not a stored status, so it catches every status that
 * badges as that label — picking "Sending" finds the campaign that happens to be
 * mid-enqueue as well as the ones already dispatching. The two transient worker
 * states get no entry of their own: they last seconds, and a filter that empties
 * itself while you read it is not a filter.
 */
export const CAMPAIGN_STATUS_FILTERS: ReadonlyArray<{
  value: string;
  label: string;
  statuses: readonly CampaignStatus[];
}> = [
  { value: "DRAFT", label: "Draft", statuses: [CampaignStatus.DRAFT] },
  { value: "SCHEDULED", label: "Scheduled", statuses: [CampaignStatus.SCHEDULED] },
  {
    value: "ACTIVE",
    label: "Sending",
    statuses: [CampaignStatus.ACTIVE, CampaignStatus.QUEUING],
  },
  { value: "RETRYING", label: "Retrying", statuses: [CampaignStatus.RETRYING] },
  {
    value: "INACTIVE",
    label: "Paused",
    statuses: [CampaignStatus.INACTIVE, CampaignStatus.DEQUEUING],
  },
  { value: "COMPLETED", label: "Completed", statuses: [CampaignStatus.COMPLETED] },
  { value: "FAILED", label: "Failed", statuses: [CampaignStatus.FAILED] },
];

/** Whether a campaign belongs in the currently selected status filter. */
export function matchesCampaignStatusFilter(status: CampaignStatus, filter: string): boolean {
  if (filter === "all") return true;
  const entry = CAMPAIGN_STATUS_FILTERS.find((f) => f.value === filter);
  return entry ? entry.statuses.includes(status) : status === filter;
}

export function CampaignStatusBadge({
  status,
  errorMessage,
  className = "",
}: Readonly<{
  status: CampaignStatus | string;
  /** Why a failed campaign stopped, shown on hover. */
  errorMessage?: string | null;
  className?: string;
}>) {
  const { t } = useTranslation("campaign.status");
  const meta = campaignStatusMeta(status);
  const failure = status === CampaignStatus.FAILED && errorMessage ? errorMessage : null;

  const badge = (
    <Badge
      variant="secondary"
      // The status flips under the reader while a campaign sends, so announce it in place.
      role="status"
      aria-label={failure ? `${t(meta.label)}: ${failure}` : undefined}
      className={`shrink-0 gap-1.5 ${meta.badge} ${className}`}
    >
      {meta.live ? (
        <span className={`size-1.5 animate-pulse rounded-full ${meta.dot}`} aria-hidden />
      ) : null}
      {t(meta.label)}
    </Badge>
  );

  // "Failed" on its own is the same dead end "Paused" was. The reason the API
  // recorded is the whole point of the status, so it travels with the badge.
  if (!failure) return badge;

  return (
    <HoverCard>
      {/* tabIndex keeps the reason reachable without a pointer. */}
      <HoverCardTrigger delay={200} render={<span tabIndex={0} className="cursor-default" />}>
        {badge}
      </HoverCardTrigger>
      <HoverCardContent className="w-64">
        <div className="mb-1 flex items-center gap-1">
          <IconAlertCircle className="text-destructive size-3" />
          <span className="text-destructive text-xs font-semibold">{t("Campaign stopped")}</span>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">{failure}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
