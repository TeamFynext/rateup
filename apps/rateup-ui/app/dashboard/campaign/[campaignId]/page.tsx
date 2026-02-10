"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useDebouncedState } from "@mantine/hooks";
import {
  ArrowLeft,
  CheckCircle,
  Edit2,
  FileDown,
  Filter,
  MoreVertical,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  CampaignParticipantStatus,
  CampaignStatus,
  CampaignType,
} from "@/types/enums";
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
import AddParticipantModal from "@/components/Campaign/AddParticipantModal";
import { CampaignPerformance } from "@/components/Campaign/CampaignPerformanceCard";
import CreateCampaignModal from "@/components/Campaign/CreateCampaignModal";
import { CONTACT_SORT } from "@/components/Contacts/utils/utils";
import useDebounce from "@/components/menu/hook/useDebounce";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouteParams } from "@/context/RouteParamsContext";
import { PAGE_SIZE } from "@/utils/constants";

import { StatusBadge } from "../../../../components/Campaign/statusBadge";

interface Participant {
  id: string;
  name: string;
  phone: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED" | "PENDING";
  consent: boolean;
}

export default function CampaignDetails() {
  const [activeTab, setActiveTab] = useState("info");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [sorting, setSorting] = useState([CONTACT_SORT]);
  const [columnFilters, setColumnFilters] = useDebouncedState([], 200);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const [selectedDripStage, setSelectedDripStage] = useState("all");
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);

  const translations = useTranslations();
  const router = useRouter();
  const params = useParams();
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

  const sendCampaignMutation = useSendCampaign(
    campaignId ?? "",
    campaignQuery.data?.teamId ?? "",
  );

  const removeMulitpleGroupParticipants = useRemoveMulitpleGroupParticipants(
    campaignId,
    () => {
      setSelectedIds([]);
      setOpenDeleteModal(false);
    },
  );

  const totalCount = participantsQuery.data?.totalCount ?? 0;

  const totalPages = useMemo(() => {
    if (!pagination.pageSize) return 1;
    return Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  }, [totalCount, pagination.pageSize]);

  const canPrevious = pagination.pageIndex > 0;
  const canNext = pagination.pageIndex < totalPages - 1;

  useEffect(() => {
    if (campaignQuery.data) {
      update({ campaignId: campaignQuery.data.name });
    }
  }, [campaignQuery.data, update]);

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

  const isAllSelected =
    participants.length > 0 && selectedIds.length === participants.length;

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
        We couldn’t load this campaign.
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
    toast.loading("Generating delivery report...", {
      id: "delivery-report",
    });
    deliveryReportMutation.mutate({
      campaignId,
      selectedDripStage,
    });
  };

  const closeEditModal = () => {
    setEditingCampaign(null);
    setIsEditOpen(false);
  };

  const openAddParticipantModal = () => {
    setIsAddParticipantOpen(true);
  };

  const closeAddParticipantModal = () => {
    setIsAddParticipantOpen(false);
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        campaignQuery.refetch(),
        statsQuery.refetch(),
        participantsQuery.refetch(),
      ]);
      toast.success("Campaign data refreshed");
    } catch {
      toast.error("Failed to refresh campaign data");
    }
  };

  const canSend =
    campaign.type !== CampaignType.DRIP &&
    [CampaignStatus.DRAFT, CampaignStatus.INACTIVE].includes(campaign.status);

  const hasFailures = campaign.failed > 0;
  const canResend =
    campaign.type !== CampaignType.DRIP &&
    campaign.failed > 0 &&
    [
      CampaignStatus.ACTIVE,
      CampaignStatus.COMPLETED,
      CampaignStatus.FAILED,
    ].includes(campaign.status);

  const handleSend = async () => {
    try {
      await sendCampaignMutation.mutateAsync({
        statuses: [
          CampaignParticipantStatus.PENDING,
          CampaignParticipantStatus.FAILED,
        ],
        sentCampaignChoice: "NOW",
        status: CampaignStatus.ACTIVE,
        type: campaign.type,
      });
    } catch {
      // error toast already handled inside hook
    }
  };

  const handleToggleDrip = async () => {
    try {
      await sendCampaignMutation.mutateAsync({
        sentCampaignChoice: "NOW", // ✅ REQUIRED by type
        status:
          campaign.status === CampaignStatus.INACTIVE
            ? CampaignStatus.ACTIVE
            : CampaignStatus.INACTIVE,
        statuses: [], // ✅ DRIP does not resend by status
        type: CampaignType.DRIP,
      });

      toast.success(
        campaign.status === CampaignStatus.INACTIVE
          ? "Drip campaign started"
          : "Drip campaign paused",
      );
    } catch (err) {
      toast.error("Failed to update drip campaign status");
    }
  };

  const handleResend = async () => {
    try {
      await sendCampaignMutation.mutateAsync({
        statuses: [CampaignParticipantStatus.FAILED],
        sentCampaignChoice: "RESEND_FAILED",
        status: campaign.status,
        type: campaign.type,
      });
    } catch {
      // error toast already handled inside hook
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleteDialogOpen(false);
      await deleteCampaignMutation.mutateAsync(campaignId);
      toast.success("Campaign deleted successfully");
      router.push("/dashboard/campaign");
    } catch {
      toast.error("Failed to delete campaign");
    }
  };

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Simple Header */}
        <div className=" border-b ">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/dashboard/campaign")}
                  className="hover:bg-slate-100 dark:hover:bg-slate-800 gap-2 text-slate-600 dark:text-slate-400"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Campaigns
                </Button>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                <div>
                  <h1 className="text-lg dark:text-slate-50">
                    {campaign.name}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Campaign ID: #{campaign.id}
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
                  Edit
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
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Tab Navigation */}
        <div className="  border-b ">
          <div className="px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between">
                <TabsList className="bg-transparent p-0 h-auto gap-2 border-0">
                  <TabsTrigger
                    value="info"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-700 dark:data-[state=inactive]:text-slate-300 rounded-lg px-4 py-2 transition-all border-0 data-[state=inactive]:shadow-none"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="participants"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-700 dark:data-[state=inactive]:text-slate-300 rounded-lg px-4 py-2 transition-all border-0 data-[state=inactive]:shadow-none"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Participants
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
                    } hover:bg-green-500 dark:hover:bg-green-600 text-white border-0 px-3 py-1`}
                  >
                    <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                    {campaign.status}
                  </Badge>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

                  {(canSend || canResend) && (
                    <Button
                      variant="outline"
                      onClick={canSend ? handleSend : handleResend}
                      disabled={canResend && !hasFailures}
                      className="rounded-full gap-2"
                      title={
                        canResend && !hasFailures
                          ? "No failed messages to resend"
                          : undefined
                      }
                    >
                      {canSend ? translations("Send") : translations("Resend")}
                      <Send className="w-4 h-4" />
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
                        ? "Start Drip"
                        : "Pause Drip"}
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
                      ? "Generating..."
                      : "Delivery Report"}
                  </Button>
                </div>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab}>
            {/* Info Tab */}
            <TabsContent value="info" className="p-6 mt-0">
              <div className="mx-auto space-y-6">
                {/* Campaign Header Card */}
                <Card className="shadow-sm py-2">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
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
                          {/* Total Participants - Prominent Display */}
                          <div className="px-6 py-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-lg bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center">
                                <Users className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                                  Total Participants
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
                            <span className="font-medium">Template:</span>
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

            {/* Participants Tab */}
            <TabsContent value="participants" className="p-6 mt-0">
              <div className="mx-auto">
                {/* Modern Toolbar */}
                <Card className="mb-4 border-slate-200 dark:border-slate-700 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={openAddParticipantModal}
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Participant
                        </Button>

                        <Button
                          variant="destructive"
                          disabled={selectedIds.length === 0}
                          onClick={() => setOpenDeleteModal(true)}
                        >
                          Delete Contacts ({selectedIds.length})
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Search */}
                        <div className="relative w-80">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-600" />
                          <Input
                            placeholder="Search by name or phone..."
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
                          Reset
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Modern Table */}
                <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            className="rounded border-slate-300 dark:border-slate-600"
                          />
                        </TableHead>

                        <TableHead className="font-medium dark:text-slate-200">
                          Name
                        </TableHead>
                        <TableHead className="font-medium dark:text-slate-200">
                          Phone
                        </TableHead>
                        <TableHead className="font-medium dark:text-slate-200">
                          Status
                        </TableHead>
                        <TableHead className="text-center font-medium dark:text-slate-200">
                          Consent
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participantsQuery.data.participants?.map(
                        (participant) => (
                          <TableRow
                            key={participant.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(participant.id)}
                                onChange={() => toggleSelectOne(participant.id)}
                                className="rounded border-slate-300 dark:border-slate-600"
                              />
                            </TableCell>

                            <TableCell className="font-medium dark:text-slate-200">
                              {participant.contact?.name}
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400 font-mono text-sm">
                              {participant.contact?.phone}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={participant.status} />
                            </TableCell>
                            <TableCell className="text-center">
                              {participant.contact.consent && (
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30">
                                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>

                  {/* Real Pagination */}
                  <div className="flex items-center justify-between px-6 py-4 border-t dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    {/* Left: page controls */}
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canPrevious}
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            pageIndex: 0,
                          }))
                        }
                      >
                        «
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canPrevious}
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            pageIndex: prev.pageIndex - 1,
                          }))
                        }
                      >
                        ‹
                      </Button>

                      <span className="px-3 text-sm dark:text-slate-400">
                        Page <strong>{pagination.pageIndex + 1}</strong> of{" "}
                        <strong>{totalPages || 1}</strong>
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canNext}
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            pageIndex: prev.pageIndex + 1,
                          }))
                        }
                      >
                        ›
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canNext}
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            pageIndex: totalPages - 1,
                          }))
                        }
                      >
                        »
                      </Button>
                    </div>

                    {/* Right: page size + count */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 dark:text-slate-400">
                          Rows per page:
                        </span>
                        <select
                          value={pagination.pageSize}
                          onChange={(e) =>
                            setPagination({
                              pageIndex: 0,
                              pageSize: Number(e.target.value),
                            })
                          }
                          className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {PAGE_SIZE.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="text-slate-700 dark:text-slate-300">
                        <strong>{totalCount.toLocaleString()}</strong>
                        <span className="text-slate-500 dark:text-slate-400 ml-1">
                          total rows
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this campaign? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {/* Delete Participants Confirmation Dialog */}
      <AlertDialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Participants</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{selectedIds.length}</strong> selected participants? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                removeMulitpleGroupParticipants.mutate({
                  data: selectedIds,
                  campaignId,
                })
              }
            >
              Delete
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
          close={closeAddParticipantModal}
          campaign={campaignQuery.data}
          campaignType={campaignQuery.data.type}
        />
      )}
    </>
  );
}
