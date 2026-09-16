// Extracted verbatim from the `/dashboard/campaign/$campaignId/` route so the route file carries routing
// config only. Behaviour is unchanged.

import {
  IconArrowLeft,
  IconChartBar,
  IconFileText,
  IconFileDownload,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconSend,
  IconTrash,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useCampaignById,
  useCampaignResponseDownloadById,
  useCampaignSends,
  useCampaignStatsById,
  useDeleteCampaignMutation,
  useRefreshCampaign,
  useSendCampaign,
} from "@/backend/campaign/campaign.query";
import { useCampaignParticipants } from "@/backend/campaign/campaignParticipants/campaignParticipants.query";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { CampaignPausedBanner } from "@/components/dashboard/campaign/CampaignPausedBanner.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import { useDebouncedState } from "@/hooks/use-debounced-state.ts";
import {
  CampaignParticipantStatus,
  CampaignSendTrigger,
  CampaignStatus,
  CampaignType,
  SentCampaignChoice,
} from "@/types/enums.ts";
import type { Campaign, CampaignDripStage } from "@/types/global";
import { CONTACT_SORT } from "@/utils/constants.ts";
import { PAGE_SIZE } from "@/utils/constants.ts";

import { CampaignAnalyticsTab } from "./analytics/CampaignAnalyticsTab.tsx";
import { CampaignStatusBadge } from "./campaignStatus.tsx";
import { CampaignOverviewTab } from "./overview/CampaignOverviewTab.tsx";
import { CampaignParticipantsTab } from "./participants/CampaignParticipantsTab.tsx";
import { ResumeCampaignDialog } from "./ResumeCampaignDialog.tsx";
import type { CampaignWizardStep } from "./wizard/useCampaignWizard.ts";

export function CampaignDetails() {
  const [activeTab, setActiveTab] = useState("info");
  const [sorting] = useState([CONTACT_SORT]);
  const [columnFilters] = useDebouncedState([], 200);

  const [pagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  // "all", or a stage id. The setter existed nowhere, so this was frozen on
  // "all" and the per-stage stats, recipients and delivery report the API has
  // always supported were unreachable from the page.
  const [selectedDripStage, setSelectedDripStage] = useState("all");
  const [resumeOpen, setResumeOpen] = useState(false);

  const { t } = useTranslation("campaign.details");
  const navigate = useNavigate();
  const params = useParams({
    strict: false,
  });
  const { update } = useRouteParams();
  const rawCampaignId = params?.campaignId;
  const confirm = useConfirm();

  const campaignId = useMemo(() => {
    if (!rawCampaignId) return undefined;
    return Array.isArray(rawCampaignId) ? rawCampaignId[0] : rawCampaignId;
  }, [rawCampaignId]);

  const campaignQuery = useCampaignById(campaignId);
  const deliveryReportMutation = useCampaignResponseDownloadById();
  const deleteCampaignMutation = useDeleteCampaignMutation(
    campaignQuery.data?.teamId,
    campaignQuery.data?.type,
  );
  // Only for the count on the tab; the table owns its own paging and search.
  const participantsQuery = useCampaignParticipants(
    campaignId,
    pagination,
    "",
    sorting,
    columnFilters,
    selectedDripStage,
  );

  const statsQuery = useCampaignStatsById(campaignId, selectedDripStage);
  const queueCount = statsQuery.data?.queueCount ?? 0;
  // Recipients still waiting to be messaged — what a resume would send to.
  const pendingCount = statsQuery.data?.countPending ?? 0;

  // The send time a pause took away, if it has not passed in the meantime. The
  // row the pause cancelled still carries it; the campaign row does not.
  //
  // The *last* scheduled send, not the soonest one still ahead. Every pause and
  // resume leaves another cancelled row behind, so a campaign rescheduled twice
  // has several — and picking the earliest date offered back the schedule the
  // sender had already replaced, which then became the row the next resume
  // offered again.
  const sendsQuery = useCampaignSends(campaignId);
  const pausedSchedule = useMemo(() => {
    const status = campaignQuery.data?.status;
    if (status !== CampaignStatus.INACTIVE && status !== CampaignStatus.PAUSED) return null;
    // `useCampaignSends` is ordered by `attemptNo`, which is the order they
    // happened in, so the last scheduled row is the most recent decision.
    const latest = (sendsQuery.data ?? []).findLast(
      (send) => send.trigger === CampaignSendTrigger.SCHEDULED && send.scheduledFor,
    );
    if (!latest?.scheduledFor) return null;
    // Past its time, there is nothing to keep — and an older row that is still in
    // the future is not "the schedule", it is one the sender moved away from.
    return new Date(latest.scheduledFor).getTime() > Date.now() ? latest.scheduledFor : null;
  }, [campaignQuery.data?.status, sendsQuery.data]);
  // The stages a drip sends, in the order they go out, plus the "All stages"
  // default. Labelled by position rather than by template name: the same
  // template can appear at more than one stage, and "Stage 2" is what the rest
  // of the page calls it.
  const dripStages = useMemo<CampaignDripStage[]>(
    () =>
      campaignQuery.data?.type === CampaignType.DRIP ? (campaignQuery.data.dripStages ?? []) : [],
    [campaignQuery.data?.type, campaignQuery.data?.dripStages],
  );
  const stageItems = useMemo(
    () => [
      { value: "all", label: t("All stages") },
      ...dripStages.flatMap((stage, index) =>
        stage.id ? [{ value: stage.id, label: t("Stage {number}", { number: index + 1 }) }] : [],
      ),
    ],
    [dripStages, t],
  );

  const sendCampaignMutation = useSendCampaign(campaignId ?? "", campaignQuery.data?.teamId ?? "");
  const { refresh, isRefreshing } = useRefreshCampaign(campaignId ?? "");

  useEffect(() => {
    if (campaignQuery.data) {
      update({ campaignId: campaignQuery.data.name });
    }
  }, [campaignQuery.data, update]);

  if (
    !campaignId ||
    campaignQuery.isPending ||
    participantsQuery.isPending ||
    statsQuery.isPending
  ) {
    return <Skeleton className="h-screen w-full" />;
  }

  if (
    campaignQuery.isError ||
    participantsQuery.isError ||
    statsQuery.isError ||
    !campaignQuery.data
  ) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-600">
        {t("We couldn't load this campaign.")}
      </div>
    );
  }

  const teamName =
    campaignQuery.data.team?.name ?? campaignQuery.data.teamName ?? campaignQuery.data.teamId ?? "";
  const stats = campaignQuery.data.stats ?? {
    participants: 0,
    pending: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
  };
  const campaign = {
    id: campaignQuery.data.id,
    name: campaignQuery.data.name,
    type: campaignQuery.data.type,
    team: teamName,
    status: campaignQuery.data.status,
    // Why a failed or paused campaign stopped — on the badge, and for PAUSED the banner too.
    errorMessage: campaignQuery.data.errorMessage ?? null,
    pauseReason: campaignQuery.data.pauseReason ?? null,
    dailySendLimit: campaignQuery.data.dailySendLimit ?? null,
    // The single-campaign endpoint joins the whole WaTemplate row as
    // `templateData`; the list endpoint flattens just the name. Read both, and
    // only fall back to the raw id when neither join came back.
    template:
      campaignQuery.data.templateData?.name ??
      campaignQuery.data.templateName ??
      campaignQuery.data.waTemplateId,
    participants: stats.participants,
    pending: stats.pending,
    sent: stats.sent,
    delivered: stats.delivered,
    read: stats.read,
    failed: stats.failed,
  };

  // Edit reopens the creation wizard rather than a second, smaller dialog: the
  // wizard is now the only place a campaign is described, so there is exactly
  // one set of fields and one validation path.
  const openEditCampaign = (campaign: Campaign, step: CampaignWizardStep = "review") => {
    void navigate({
      to: "/dashboard/campaign/$campaignId/edit",
      params: { campaignId: campaign.id },
      search: { step },
    });
  };

  const handleDeliveryReport = (format: "xlsx" | "ods" = "xlsx") => {
    toast.loading("Generating delivery report...", { id: "delivery-report" });
    deliveryReportMutation.mutate({ campaignId, selectedDripStage, format });
  };

  // A drip the platform paused starts again the same way one its owner paused does.
  const dripStopped =
    campaign.status === CampaignStatus.INACTIVE || campaign.status === CampaignStatus.PAUSED;
  const canResume =
    campaign.type !== CampaignType.DRIP &&
    (campaign.status === CampaignStatus.INACTIVE || campaign.status === CampaignStatus.PAUSED) &&
    pendingCount > 0;

  const handleToggleDrip = () => {
    sendCampaignMutation.mutate(
      {
        sentCampaignChoice: SentCampaignChoice.NOW,
        status: dripStopped ? CampaignStatus.ACTIVE : CampaignStatus.INACTIVE,
        statuses: [],
        type: CampaignType.DRIP,
      },
      {
        onSuccess: () => {
          toast.success(dripStopped ? t("Drip campaign started") : t("Drip campaign paused"));
        },
        onError: (error) => {
          toast.error(error?.message || t("Failed to update drip campaign status"));
        },
      },
    );
  };

  const handleDelete = async () => {
    const shouldDelete = await confirm({
      title: t("Delete Campaign"),
      description: t(
        "Are you sure you want to delete this campaign? This action cannot be undone.",
      ),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });

    if (!shouldDelete) return;

    deleteCampaignMutation.mutate(campaignId, {
      onSuccess: () => {
        toast.success("Campaign deleted successfully");
        navigate({
          to: "/dashboard/campaign",
        });
      },
      onError: (error) => {
        toast.error(error?.message || "Failed to delete campaign");
      },
    });
  };

  /**
   * Take the campaign off the queue.
   *
   * "Pause" rather than "Stop" because that is what it does and what the status
   * has always been called — the badge reads Paused, and the campaign can be
   * picked up again from where it stopped. Messages Meta has already accepted
   * cannot be recalled, which is what the dialog says before it runs.
   */
  const handlePauseCampaign = async () => {
    const shouldPause = await confirm({
      title: t("Pause campaign"),
      description: t(
        "Recipients who have not been messaged yet are taken off the queue. Messages already sent cannot be recalled. You can resume the campaign later.",
      ),
      confirmText: t("Pause"),
      cancelText: t("Cancel"),
    });
    if (!shouldPause) return;

    sendCampaignMutation.mutate(
      {
        status: CampaignStatus.INACTIVE,
        // Ignored by the API on this path — it dequeues rather than sends — but
        // the schema demands a non-empty list.
        statuses: [CampaignParticipantStatus.PENDING],
        type: campaign.type,
        sentCampaignChoice: SentCampaignChoice.NOW,
      },
      {
        onSuccess: () => {
          toast.success(t("messages.campaignStopped"));
        },
        onError: (error) => {
          toast.error(error?.message || t("messages.campaignStopError"));
        },
      },
    );
  };

  /**
   * Pick a paused campaign back up.
   *
   * Only the recipients it never reached: a resume is a fresh send targeting
   * PENDING, so nobody who already received the message gets it twice. Failures
   * are deliberately not included — re-attempting those is what Resend and the
   * retry engine are for, and folding them in here would make Resume mean two
   * different things depending on when it was pressed.
   *
   * When it goes out is the sender's choice, taken in `ResumeCampaignDialog`:
   * back on the schedule the pause took away, immediately, or at a new time.
   * Pausing clears `campaignSentAt`, so the old time is read off the send row the
   * pause cancelled — the dequeue only marks it CANCELLED and leaves
   * `scheduledFor` alone — and is offered as the default, because resuming a
   * campaign scheduled for next month by sending it now is a mistake nobody can
   * undo.
   */
  const handleResumeCampaign = (sendAt: Date | null) => {
    setResumeOpen(false);
    sendCampaignMutation.mutate({
      status: CampaignStatus.ACTIVE,
      statuses: [CampaignParticipantStatus.PENDING],
      type: campaign.type,
      ...(sendAt
        ? { sentCampaignChoice: SentCampaignChoice.LATER, campaignSentAt: sendAt }
        : { sentCampaignChoice: SentCampaignChoice.NOW }),
    });
  };

  return (
    <div className="flex flex-col relative h-full">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="bg-card flex shrink-0 flex-col gap-3.5 px-8 pt-5">
        <div className="flex items-center justify-between gap-5">
          <div className="flex gap-3">
            <Link
              to="/dashboard/campaign"
              className="text-muted-foreground hover:text-foreground inline-flex w-max items-center gap-1 text-[13px]"
            >
              <IconArrowLeft className="size-3.5" aria-hidden />
            </Link>
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="font-display truncate text-2xl font-bold tracking-tight">
                {campaign.name}
              </h1>
              <CampaignStatusBadge status={campaign.status} errorMessage={campaign.errorMessage} />
              {/* The template is the single most-asked question about a running
                  campaign, so it sits in the title row rather than a tab away. */}
              {campaign.template ? (
                <span className="bg-secondary text-secondary-foreground inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs">
                  <IconFileText className="text-muted-foreground size-3.5" aria-hidden />
                  {campaign.template}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Statuses arrive after the send drains and retries fire on their
                  own, so the page a customer is watching goes stale on its own.
                  One button re-reads all three tabs, not just the visible one —
                  the same control the campaigns list carries, so it looks and
                  behaves the same on both screens. */}
            <RefreshButton onClick={() => void refresh()} isLoading={isRefreshing} />
            <Button variant="ghost" onClick={() => openEditCampaign(campaignQuery.data)}>
              <IconPencil className="size-4" aria-hidden />
              {t("Edit")}
            </Button>
            {/* One control, not two. Export used to be a bare button hardcoded
                  to xlsx while a second "Delivery Report" dropdown lower down
                  offered the same download with a format choice — the same
                  action in two places, one of which quietly ignored half of it. */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" disabled={deliveryReportMutation.isPending} />}
              >
                <IconFileDownload className="size-4" aria-hidden />
                {deliveryReportMutation.isPending ? t("Generating...") : t("Export")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* The label is a Base UI menu group part, so it only works
                      inside a Group — on its own it throws for a missing
                      MenuGroupContext. */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t("Delivery Report")}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleDeliveryReport("xlsx")}>
                    {t("Download as Excel")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeliveryReport("ods")}>
                    {t("Download as OpenDocument (ODS)")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Adding recipients is editing the audience, and the wizard's
                  Audience step is the one place that does it — it shows who is
                  already on the campaign, adds, and removes. The dialog this
                  used to open was a second, older copy of the same picker. */}
            <Button onClick={() => openEditCampaign(campaignQuery.data, "audience")}>
              <IconSend className="size-4" aria-hidden />
              {t("Send to more")}
            </Button>
            {/* Delete is the whole menu, so it is the button. A dropdown holding
                one item asks for a click to learn what is behind it, and the
                confirm dialog is what actually guards the action. */}
            <Button
              variant="outline"
              size="icon"
              className="text-destructive hover:text-destructive"
              aria-label={t("Delete")}
              title={t("Delete")}
              onClick={handleDelete}
            >
              <IconTrash className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
        <CampaignPausedBanner
          status={campaign.status}
          pauseReason={campaign.pauseReason}
          errorMessage={campaign.errorMessage}
          pendingCount={pendingCount}
          canResume={canResume || (campaign.type === CampaignType.DRIP && dripStopped)}
          isResuming={sendCampaignMutation.isPending}
          onResume={
            campaign.type === CampaignType.DRIP ? handleToggleDrip : () => setResumeOpen(true)
          }
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
        {/* ── Tab nav bar. Part of the header band above it, not a second
                 bar: same surface, same padding, one border underneath. ──── */}
        <div className="border-border bg-card shrink-0 border-b">
          <div className="px-8">
            <div className="flex items-center justify-between py-2">
              <TabsList>
                <TabsTrigger value="info">
                  <IconTrendingUp className="w-4 h-4 mr-2" />
                  {t("Overview")}
                </TabsTrigger>
                <TabsTrigger value="participants">
                  <IconUsers className="w-4 h-4 mr-2" />
                  {t("Participants")}
                  <Badge
                    variant="secondary"
                    className="ml-2 data-[state=active]:bg-white/20 data-[state=active]:text-white"
                  >
                    {participantsQuery.data?.totalCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  <IconChartBar className="w-4 h-4 mr-2" />
                  {t("Analytics")}
                </TabsTrigger>
              </TabsList>

              {/* Sending and scheduling belong to the wizard's Review step, which
                    is the one place that describes what is about to go out. The
                    old Send/Resend dialog here was a second, older copy of that
                    decision — a different set of fields reaching the same API. */}
              <div className="flex items-center gap-2 py-2.5">
                {campaign.type !== CampaignType.DRIP &&
                  queueCount > 0 &&
                  ![
                    CampaignStatus.QUEUING,
                    CampaignStatus.DEQUEUING,
                    CampaignStatus.PAUSED,
                  ].includes(campaign.status) && (
                    <Button
                      variant="outline"
                      className="rounded-md gap-2"
                      disabled={sendCampaignMutation.isPending}
                      onClick={() => void handlePauseCampaign()}
                    >
                      <IconPlayerPause className="w-4 h-4" />
                      {t("Pause")}
                    </Button>
                  )}

                {/* A paused campaign with nobody left to message is finished, not
                      resumable — offering Resume there would send to no one and
                      come back as "no participants with the specified statuses". */}
                {canResume && (
                  <Button
                    className="rounded-md gap-2"
                    disabled={sendCampaignMutation.isPending}
                    title={t("Sends to the {count} recipients not messaged yet", {
                      count: pendingCount.toLocaleString(),
                    })}
                    onClick={() => setResumeOpen(true)}
                  >
                    <IconPlayerPlay className="w-4 h-4" />
                    {t("Resume")}
                    <span className="text-xs opacity-80 tabular-nums">
                      {pendingCount.toLocaleString()}
                    </span>
                  </Button>
                )}

                {/* Only on Recipients. The participants endpoint takes a stage;
                    the analytics one has no stage dimension at all, and the
                    Overview's metrics are campaign-wide — so offering the picker
                    there would be a control that quietly does nothing. */}
                {campaign.type === CampaignType.DRIP &&
                  dripStages.length > 0 &&
                  activeTab === "participants" && (
                    <Select
                      items={stageItems}
                      value={selectedDripStage}
                      onValueChange={(value) => setSelectedDripStage(value ?? "all")}
                    >
                      <SelectTrigger size="sm" className="w-44" aria-label={t("Drip stage")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stageItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                {campaign.type === CampaignType.DRIP && (
                  <Button
                    variant={campaign.status === CampaignStatus.ACTIVE ? "destructive" : "outline"}
                    onClick={handleToggleDrip}
                    className="rounded-full gap-2"
                  >
                    {campaign.status === CampaignStatus.PAUSED
                      ? t("Resume Drip")
                      : campaign.status === CampaignStatus.INACTIVE
                        ? t("Start Drip")
                        : t("Pause Drip")}
                    <IconSend className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <TabsContent value="info" className="mt-0 min-h-0 flex-1 overflow-auto px-8 pt-6 pb-6">
          <CampaignOverviewTab campaign={campaignQuery.data} />
        </TabsContent>

        <TabsContent
          value="participants"
          className="mt-0 flex min-h-0 flex-1 flex-col px-8 pt-4 pb-6"
        >
          <CampaignParticipantsTab
            campaign={campaignQuery.data}
            selectedDripStage={selectedDripStage}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0 min-h-0 flex-1 overflow-auto px-8 pt-4 pb-6">
          <CampaignAnalyticsTab campaignId={campaignId} />
        </TabsContent>
      </Tabs>

      <ResumeCampaignDialog
        open={resumeOpen}
        onOpenChange={setResumeOpen}
        scheduledFor={pausedSchedule}
        pendingCount={pendingCount}
        isPending={sendCampaignMutation.isPending}
        onConfirm={handleResumeCampaign}
      />
    </div>
  );
}
