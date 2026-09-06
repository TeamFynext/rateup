// Extracted verbatim from the `/dashboard/campaign/$campaignId/` route so the route file carries routing
// config only. Behaviour is unchanged.

import {
  IconArrowLeft,
  IconChartBar,
  IconFileText,
  IconDotsVertical,
  IconFileDownload,
  IconPencil,
  IconSend,
  IconSquare,
  IconTrash,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useCampaignById,
  useCampaignResponseDownloadById,
  useCampaignStatsById,
  useDeleteCampaignMutation,
  useSendCampaign,
} from "@/backend/campaign/campaign.query";
import { useCampaignParticipants } from "@/backend/campaign/campaignParticipants/campaignParticipants.query";
import AddParticipantModal from "@/components/Campaign/AddParticipantModal.tsx";
import type { ResendOptions } from "@/components/Campaign/ResendCampaignModal.tsx";
import { ResendCampaignModal } from "@/components/Campaign/ResendCampaignModal.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import { useDebouncedState } from "@/hooks/use-debounced-state.ts";
import {
  CampaignParticipantStatus,
  CampaignStatus,
  CampaignType,
  SendMode,
  SentCampaignChoice,
} from "@/types/enums.ts";
import type { Campaign } from "@/types/global";
import { CONTACT_SORT } from "@/utils/constants.ts";
import { PAGE_SIZE } from "@/utils/constants.ts";

import { CampaignAnalyticsTab } from "./analytics/CampaignAnalyticsTab.tsx";
import { CampaignStatusBadge } from "./campaignStatus.tsx";
import { CampaignOverviewTab } from "./overview/CampaignOverviewTab.tsx";
import { CampaignParticipantsTab } from "./participants/CampaignParticipantsTab.tsx";

export function CampaignDetails() {
  const [activeTab, setActiveTab] = useState("info");
  const [sorting] = useState([CONTACT_SORT]);
  const [columnFilters] = useDebouncedState([], 200);
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);

  const [pagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const [selectedDripStage] = useState("all");
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);

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
  const sendCampaignMutation = useSendCampaign(campaignId ?? "", campaignQuery.data?.teamId ?? "");

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
    // Why a failed campaign stopped — the status badge is the only place it surfaces.
    errorMessage: campaignQuery.data.errorMessage ?? null,
    dailySendLimit: campaignQuery.data.dailySendLimit ?? null,
    template: campaignQuery.data.template?.name ?? campaignQuery.data.waTemplateId,
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
  const openEditCampaign = (campaign: Campaign) => {
    void navigate({
      to: "/dashboard/campaign/$campaignId/edit",
      params: { campaignId: campaign.id },
      search: { step: "review" },
    });
  };

  const handleDeliveryReport = (format: "xlsx" | "ods" = "xlsx") => {
    toast.loading("Generating delivery report...", { id: "delivery-report" });
    deliveryReportMutation.mutate({ campaignId, selectedDripStage, format });
  };

  const isQueuing =
    campaign.status === CampaignStatus.QUEUING || campaign.status === CampaignStatus.DEQUEUING;

  const canSend =
    campaign.type !== CampaignType.DRIP &&
    [CampaignStatus.DRAFT, CampaignStatus.INACTIVE].includes(campaign.status);
  const handleSend = () => {
    setIsResendModalOpen(true);
  };

  const handleResendSubmit = (options: ResendOptions) => {
    sendCampaignMutation.mutate(
      {
        statuses: options.statuses,
        sentCampaignChoice:
          options.sendMode === SendMode.NOW ? SentCampaignChoice.NOW : SentCampaignChoice.LATER,
        campaignSentAt:
          options.sendMode === SendMode.SCHEDULED
            ? dayjs(`${options.scheduleDate} ${options.scheduleTime}`, "YYYY-MM-DD HH:mm").toDate()
            : undefined,
        type: campaign.type,
        status: canSend ? CampaignStatus.ACTIVE : campaign.status,
        dailySendLimit: options.dailySendLimit,
      },
      {
        onSuccess: () => {
          setIsResendModalOpen(false);
        },
      },
    );
  };

  const handleToggleDrip = () => {
    sendCampaignMutation.mutate(
      {
        sentCampaignChoice: SentCampaignChoice.NOW,
        status:
          campaign.status === CampaignStatus.INACTIVE
            ? CampaignStatus.ACTIVE
            : CampaignStatus.INACTIVE,
        statuses: [],
        type: CampaignType.DRIP,
      },
      {
        onSuccess: () => {
          toast.success(
            campaign.status === CampaignStatus.INACTIVE
              ? t("Drip campaign started")
              : t("Drip campaign paused"),
          );
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

  const handleStopCampaign = () => {
    sendCampaignMutation.mutate(
      {
        status: CampaignStatus.INACTIVE,
        statuses: [CampaignParticipantStatus.FAILED],
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

  return (
    <>
      <div className="flex flex-col relative h-full">
        {/* ── Header (fixed height) ─────────────────────────────────── */}
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="bg-card flex shrink-0 flex-col gap-3.5 px-8 pt-5">
          <Link
            to="/dashboard/campaign"
            className="text-muted-foreground hover:text-foreground inline-flex w-max items-center gap-1 text-[13px]"
          >
            <IconArrowLeft className="size-3.5" aria-hidden />
            {t("Campaigns")}
          </Link>

          <div className="flex items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="font-display truncate text-2xl font-bold tracking-tight">
                {campaign.name}
              </h1>
              <CampaignStatusBadge status={campaign.status} errorMessage={campaign.errorMessage} />
              {/* The template is the single most-asked question about a running
                  campaign, so it sits in the title row rather than a tab away. */}
              {campaign.template ? (
                <span className="bg-secondary text-secondary-foreground inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 font-mono text-xs">
                  <IconFileText className="text-muted-foreground size-3.5" aria-hidden />
                  {campaign.template}
                </span>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" onClick={() => openEditCampaign(campaignQuery.data)}>
                <IconPencil className="size-4" aria-hidden />
                {t("Edit")}
              </Button>
              <Button variant="ghost" onClick={() => handleDeliveryReport("xlsx")}>
                <IconFileDownload className="size-4" aria-hidden />
                {t("Export")}
              </Button>
              <Button onClick={() => setIsAddParticipantOpen(true)}>
                <IconSend className="size-4" aria-hidden />
                {t("Send to more")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="icon" aria-label={t("More actions")} />}
                >
                  <IconDotsVertical className="size-4" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <IconTrash className="mr-2 size-4" aria-hidden />
                    {t("Delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 min-h-0 flex flex-col"
        >
          {/* ── Tab nav bar. Part of the header band above it, not a second
                 bar: same surface, same padding, one border underneath. ──── */}
          <div className="border-border bg-card shrink-0 border-b">
            <div className="px-8">
              <div className="flex items-center justify-between">
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

                <div className="flex items-center gap-2 py-2.5">
                  {campaign.type !== CampaignType.DRIP && !isQueuing && (
                    <Button
                      variant="outline"
                      className="rounded-md gap-2"
                      onClick={() => {
                        if (canSend) {
                          handleSend();
                        } else {
                          setIsResendModalOpen(true);
                        }
                      }}
                    >
                      <IconSend className="w-4 h-4" />
                      {canSend ? t("Send") : t("Resend")}
                    </Button>
                  )}
                  {campaign.type !== CampaignType.DRIP &&
                    queueCount > 0 &&
                    ![CampaignStatus.QUEUING, CampaignStatus.DEQUEUING].includes(
                      campaign.status,
                    ) && (
                      <Button
                        variant="destructive"
                        className="rounded-full gap-2"
                        onClick={handleStopCampaign}
                      >
                        Stop
                        <IconSquare className="w-4 h-4" />
                      </Button>
                    )}

                  {campaign.type === CampaignType.DRIP && (
                    <Button
                      variant={
                        campaign.status === CampaignStatus.ACTIVE ? "destructive" : "outline"
                      }
                      onClick={handleToggleDrip}
                      className="rounded-full gap-2"
                    >
                      {campaign.status === CampaignStatus.INACTIVE
                        ? t("Start Drip")
                        : t("Pause Drip")}
                      <IconSend className="w-4 h-4" />
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          size="sm"
                          disabled={deliveryReportMutation.isPending}
                          className="gap-2"
                        />
                      }
                    >
                      <IconFileDownload className="w-3.5 h-3.5" />
                      {deliveryReportMutation.isPending ? t("Generating...") : t("Delivery Report")}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDeliveryReport("xlsx")}>
                        {t("Download as Excel")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeliveryReport("ods")}>
                        {t("Download as OpenDocument (ODS)")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          <TabsContent value="info" className="mt-0 min-h-0 flex-1 overflow-auto px-8 pt-6 pb-8">
            <CampaignOverviewTab campaign={campaignQuery.data} />
          </TabsContent>

          <TabsContent
            value="participants"
            className="mt-0 flex min-h-0 flex-1 flex-col px-8 pt-4 pb-6"
          >
            <CampaignParticipantsTab
              campaign={campaignQuery.data}
              onAddParticipants={() => setIsAddParticipantOpen(true)}
            />
          </TabsContent>

          <TabsContent
            value="analytics"
            className="mt-0 min-h-0 flex-1 overflow-auto px-8 pt-4 pb-6"
          >
            <CampaignAnalyticsTab campaignId={campaignId} />
          </TabsContent>
        </Tabs>
      </div>
      {/* ── Dialogs (portalled, outside layout flow) ──────────────────── */}
      {isAddParticipantOpen && campaignQuery.data && (
        <AddParticipantModal
          close={() => setIsAddParticipantOpen(false)}
          campaign={campaignQuery.data}
          campaignType={campaignQuery.data.type}
        />
      )}
      <ResendCampaignModal
        isOpen={isResendModalOpen}
        onClose={() => setIsResendModalOpen(false)}
        onSubmit={handleResendSubmit}
        isLoading={sendCampaignMutation.isPending}
        isFirstSend={canSend}
        campaignId={campaignId ?? undefined}
        campaignDailySendLimit={campaignQuery.data?.dailySendLimit ?? null}
        stats={{
          failed: statsQuery.data?.countFailed,
          pending: statsQuery.data?.countPending,
          sent: statsQuery.data?.countSent,
          delivered: statsQuery.data?.countDelivered,
          read: statsQuery.data?.countRead,
          completed: statsQuery.data?.countCompleted,
        }}
      />
    </>
  );
}
