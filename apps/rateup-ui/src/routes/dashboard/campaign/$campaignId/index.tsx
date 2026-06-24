import { useEffect, useMemo, useState } from "react";

import { useDebouncedState } from "@mantine/hooks";
import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import {
  ArrowLeft,
  CheckCircle,
  Edit2,
  FileDown,
  MoreVertical,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Square,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  CampaignParticipantStatus,
  CampaignStatus,
  CampaignType,
  SendMode,
  SentCampaignChoice,
} from "@/types/enums.ts";
import {
  useCampaignById,
  useCampaignResponseDownloadById,
  useCampaignStatsById,
  useDeleteCampaignMutation,
  useSendCampaign,
} from "@/backend/campaign/campaign.query";
import {
  useCampaignParticipants,
  useRemoveMulitpleGroupParticipants,
} from "@/backend/campaign/campaignParticipants/campaignParticipants.query";
import AddParticipantModal from "@/components/Campaign/AddParticipantModal.tsx";
import { CampaignPerformance } from "@/components/Campaign/CampaignPerformanceCard.tsx";
import CreateCampaignModal from "@/components/Campaign/CreateCampaignModal.tsx";
import type { ResendOptions } from "@/components/Campaign/ResendCampaignModal.tsx";
import { ResendCampaignModal } from "@/components/Campaign/ResendCampaignModal.tsx";
import { StatusBadge } from "@/components/Campaign/statusBadge.tsx";
import { CONTACT_SORT } from "@/components/Contacts/utils/utils.tsx";
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import { DataTable } from "@/components/Table/data-table.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import { PAGE_SIZE } from "@/utils/constants.ts";

export const Route = createFileRoute("/dashboard/campaign/$campaignId/")({
  component: CampaignDetails,
});

function CampaignDetails() {
  const [activeTab, setActiveTab] = useState("info");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [sorting, setSorting] = useState([CONTACT_SORT]);
  const [columnFilters, setColumnFilters] = useDebouncedState([], 200);
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const [selectedDripStage, setSelectedDripStage] = useState("all");
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [sendingParticipantId, setSendingParticipantId] = useState<
    string | null
  >(null);

  const { t } = useTranslation("campaign.details");
  const navigate = useNavigate();
  const params = useParams({
    strict: false,
  });
  const { update } = useRouteParams();
  const rawCampaignId = params?.campaignId;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

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
  const debouncedSearch = useDebounce(searchInput, 200);
  const participantsQuery = useCampaignParticipants(
    campaignId,
    pagination,
    debouncedSearch,
    sorting,
    columnFilters,
    selectedDripStage,
  );
  const participants = participantsQuery.data?.participants ?? [];

  const statsQuery = useCampaignStatsById(campaignId, selectedDripStage);
  const queueCount = statsQuery.data?.queueCount ?? 0;
  const sendCampaignMutation = useSendCampaign(
    campaignId ?? "",
    campaignQuery.data?.teamId ?? "",
  );
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(participants.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      // ───────────── Select Column ─────────────
      {
        id: "select",
        size: 50,
        header: () => {
          const allSelected =
            participants.length > 0 &&
            selectedIds.length === participants.length;

          return (
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => toggleSelectAll(checked === true)}
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.includes(row.original.id)}
            onCheckedChange={() => toggleSelectOne(row.original.id)}
          />
        ),
      },

      // ───────────── Name ─────────────
      {
        accessorKey: "contact.name",
        header: t("Name"),
        cell: ({ row }) => (
          <div className="font-medium dark:text-slate-200">
            {row.original.contact?.name}
          </div>
        ),
      },

      // ───────────── Phone ─────────────
      {
        accessorKey: "contact.phone",
        header: t("Phone"),
        cell: ({ row }) => (
          <div className="text-slate-600 dark:text-slate-400 font-mono text-sm">
            {row.original.contact?.phone}
          </div>
        ),
      },

      // ───────────── Status ─────────────
      {
        accessorKey: "status",
        header: t("Status"),
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            errorMessage={row.original.errorMessage}
          />
        ),
      },

      // ───────────── Consent ─────────────
      {
        accessorKey: "contact.consent",
        header: () => (
          <div className="text-center font-medium">{t("Consent")}</div>
        ),
        cell: ({ row }) =>
          row.original.contact?.consent ? (
            <div className="flex justify-center">
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          ) : null,
      },

      // ───────────── Actions ─────────────
      {
        id: "actions",
        size: 80,
        header: () => <div className="text-center font-medium">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSendIndividual(row.original.id)}
              disabled={!!sendingParticipantId}
              className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              {sendingParticipantId === row.original.id ? (
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        ),
      },
    ],
    [participants.length, selectedIds, sendingParticipantId, t],
  );
  const removeMulitpleGroupParticipants = useRemoveMulitpleGroupParticipants(
    campaignId,
    () => {
      setSelectedIds([]);
      setOpenDeleteModal(false);
    },
  );

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

  const campaignInfo = {
    template: campaignQuery.data?.templateData?.name,
    team: campaignQuery.data?.teamName,
  };

  const teamName =
    campaignQuery.data.team?.name ??
    campaignQuery.data.teamName ??
    campaignQuery.data.teamId ??
    "";
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
    template:
      campaignQuery.data.template?.name ?? campaignQuery.data.waTemplateId,
    participants: stats.participants,
    pending: stats.pending,
    sent: stats.sent,
    delivered: stats.delivered,
    read: stats.read,
    failed: stats.failed,
  };

  const openEditCampaign = (campaign: any) => {
    setEditingCampaign(campaign);
    setIsEditOpen(true);
  };

  const handleDeliveryReport = () => {
    toast.loading("Generating delivery report...", { id: "delivery-report" });
    deliveryReportMutation.mutate({ campaignId, selectedDripStage });
  };

  const isQueuing =
    campaign.status === CampaignStatus.QUEUING ||
    campaign.status === CampaignStatus.DEQUEUING;

  const closeEditModal = () => {
    setEditingCampaign(null);
    setIsEditOpen(false);
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        campaignQuery.refetch(),
        statsQuery.refetch(),
        participantsQuery.refetch(),
      ]);
      toast.success(t("Campaign data refreshed"));
    } catch {
      toast.error(t("Failed to refresh campaign data"));
    }
  };

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
          options.sendMode === SendMode.NOW
            ? SentCampaignChoice.NOW
            : SentCampaignChoice.LATER,
        campaignSentAt:
          options.sendMode === SendMode.SCHEDULED
            ? dayjs(
                `${options.scheduleDate} ${options.scheduleTime}`,
                "YYYY-MM-DD HH:mm",
              ).toDate()
            : undefined,
        type: campaign.type,
        status: canSend ? CampaignStatus.ACTIVE : campaign.status,
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
          toast.error(
            error?.message || t("Failed to update drip campaign status"),
          );
        },
      },
    );
  };

  const handleSendIndividual = (participantId: string) => {
    setSendingParticipantId(participantId);
    sendCampaignMutation.mutate(
      {
        statuses: [
          CampaignParticipantStatus.PENDING,
          CampaignParticipantStatus.FAILED,
        ],
        sentCampaignChoice: SentCampaignChoice.NOW,
        participantId,
        type: campaign.type,
        status: campaign.status,
      },
      {
        onSuccess: () => {
          setSendingParticipantId(null);
          toast.success("Message sent successfully");
        },
        onError: () => {
          setSendingParticipantId(null);
        },
      },
    );
  };

  const handleDelete = () => {
    deleteCampaignMutation.mutate(campaignId, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
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
        <div className="shrink-0 border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate({
                      to: "/dashboard/campaign",
                    })
                  }
                  className="hover:bg-slate-100 dark:hover:bg-slate-800 gap-2 text-slate-600 dark:text-slate-400"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("Back to Campaigns")}
                </Button>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                <div>
                  <h1 className="text-lg dark:text-slate-50">
                    {campaign.name}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("Campaign ID: #{id}", { id: campaign.id })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditCampaign(campaignQuery.data)}
                  className="gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Edit2 className="w-4 h-4" />
                  {t("Edit")}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("Delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 min-h-0 flex flex-col"
        >
          {/* ── Tab nav bar (fixed height) ─────────────────────────── */}
          <div className="shrink-0 border-b">
            <div className="px-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="info">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {t("Overview")}
                  </TabsTrigger>
                  <TabsTrigger value="participants">
                    <Users className="w-4 h-4 mr-2" />
                    {t("Participants")}
                    <Badge
                      variant="secondary"
                      className="ml-2 data-[state=active]:bg-white/20 data-[state=active]:text-white"
                    >
                      {participantsQuery.data?.totalCount}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2 py-3">
                  <Badge
                    className={`${
                      campaign.status === "ACTIVE"
                        ? "bg-green-500 dark:bg-green-600"
                        : "bg-slate-400 dark:bg-slate-600"
                    } hover:bg-green-500 dark:hover:bg-green-600 text-white border-0 px-3 py-4 rounded-md`}
                  >
                    <div className="w-2.5 h-2.5 bg-white rounded-full mr-1.5 animate-pulse" />
                    {campaign.status}
                  </Badge>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

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
                      <Send className="w-4 h-4" />
                      {canSend ? t("Send") : t("Resend")}
                    </Button>
                  )}
                  {campaign.type !== CampaignType.DRIP &&
                    queueCount > 0 &&
                    ![
                      CampaignStatus.QUEUING,
                      CampaignStatus.DEQUEUING,
                    ].includes(campaign.status) && (
                      <Button
                        variant="destructive"
                        className="rounded-full gap-2"
                        onClick={handleStopCampaign}
                      >
                        Stop
                        <Square className="w-4 h-4" />
                      </Button>
                    )}

                  {campaign.type === CampaignType.DRIP && (
                    <Button
                      variant={
                        campaign.status === CampaignStatus.ACTIVE
                          ? "destructive"
                          : "outline"
                      }
                      onClick={handleToggleDrip}
                      className="rounded-full gap-2"
                    >
                      {campaign.status === CampaignStatus.INACTIVE
                        ? t("Start Drip")
                        : t("Pause Drip")}
                      <Send className="w-4 h-4" />
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={handleDeliveryReport}
                    disabled={deliveryReportMutation.isPending}
                    className="gap-2"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    {deliveryReportMutation.isPending
                      ? t("Generating...")
                      : t("Delivery Report")}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <TabsContent
            value="info"
            className="flex-1 min-h-0 overflow-auto mt-0 p-6"
          >
            <div className="mx-auto space-y-6">
              {/* Campaign Header Card */}
              <Card>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                          <Send className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-xl dark:text-slate-50">
                            {campaign.name}
                          </h2>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">{campaign.type}</Badge>
                            <Badge variant="outline">
                              Team: {campaignInfo?.team}
                            </Badge>
                          </div>
                        </div>
                        {/* Total Participants */}
                        <div className="px-6 py-4 rounded-xl bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-1 border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-lg bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center">
                              <Users className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                                {t("Total Participants")}
                              </div>
                              <div className="text-2xl text-slate-900 dark:text-slate-50">
                                {participantsQuery.data?.totalCount}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="font-medium">{t("Template:")}</span>
                          <span>{campaignInfo?.template}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRefresh}
                      className="text-slate-400 dark:text-slate-600 hover:text-primary hover:bg-primary/10"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <CampaignPerformance
                data={{
                  sent: statsQuery.data?.countSent,
                  delivered: statsQuery.data?.countDelivered,
                  read: statsQuery.data?.countRead,
                  pending: statsQuery.data?.countPending,
                  failed: statsQuery.data?.countFailed,
                }}
              />
            </div>
          </TabsContent>

          <TabsContent
            value="participants"
            className="flex-1 min-h-0 flex flex-col mt-0 p-0"
          >
            {/* Toolbar (fixed height, never scrolls) */}
            <Card className="mb-4 p-0  ">
              <CardContent className="mx-0">
                <div className="shrink-0  pt-6 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setIsAddParticipantOpen(true)}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {t("Add Participant")}
                      </Button>
                      {selectedIds?.length > 0 && (
                        <Button
                          variant="destructive"
                          disabled={selectedIds.length === 0}
                          onClick={() => setOpenDeleteModal(true)}
                        >
                          {t("Delete Contacts ({count})", {
                            count: selectedIds.length?.toString(),
                          })}
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-600" />
                        <Input
                          placeholder={t("Search by name or phone...")}
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          className="pl-9 h-9 border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                        />
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 text-slate-600 dark:text-slate-400 hover:text-primary"
                        onClick={() => setSearchInput("")}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {t("Reset")}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>{" "}
            </Card>
            <div className="flex-1 min-h-0 overflow-hidden">
              <DataTable
                columns={columns}
                data={participantsQuery.data?.participants || []}
                isPending={participantsQuery.isPending}
                serverSide={{
                  pagination,
                  onPaginationChange: setPagination,
                  rowCount: participantsQuery.data?.totalCount || 0,
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {/* ── Dialogs (portalled, outside layout flow) ──────────────────── */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Campaign")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Are you sure you want to delete this campaign? This action cannot be undone.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Participants")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Are you sure you want to delete {count} selected participants? This action cannot be undone.",
                {
                  count: selectedIds.length?.toString(),
                },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                removeMulitpleGroupParticipants.mutate({
                  data: selectedIds,
                  campaignId,
                })
              }
            >
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {isEditOpen && editingCampaign && (
        <CreateCampaignModal
          isEdit
          campaign={editingCampaign}
          close={closeEditModal}
          campaignType={editingCampaign.type}
        />
      )}
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
