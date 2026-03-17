"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Filter, MessageSquare, RotateCcw, Send } from "lucide-react";
import { useExtracted } from "next-intl";

import { CampaignType } from "@/types/enums";
import {
  useCampaignById,
  useCampaignData,
} from "@/backend/campaign/campaign.query";
import UnauthorizedPage from "@/components/404/UnAuthorizedError";
import CampaignCardList from "@/components/Campaign/CampaignListCard";
import CreateCampaignModal from "@/components/Campaign/CreateCampaignModal";
import { ListPageLayout } from "@/components/common/list-page-layout";
import { sortData } from "@/components/Dashboard/SortDropDown";
import { TeamSelector } from "@/components/input/TeamSelector";
import useDebounce from "@/components/menu/hook/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CampaignsPage() {
  const t = useExtracted("campaign.list");
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<CampaignType>(
    CampaignType.WHATSAPP,
  );
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );

  const campaignByIdQuery = useCampaignById(selectedCampaignId);
  const whatsappQuery = useCampaignData(CampaignType.WHATSAPP);
  const dripQuery = useCampaignData(CampaignType.DRIP);

  const activeQuery =
    activeTab === CampaignType.WHATSAPP ? whatsappQuery : dripQuery;

  const { data, isPending, isError, error, refetch } = activeQuery;

  const openEditCampaign = (campaign: any) => {
    setSelectedCampaignId(campaign.id);
  };

  const debouncedSearch = useDebounce(search.trim(), 200);

  const campaigns = data?.data ?? [];
  const filteredCampaigns = useMemo(() => {
    const filtered = campaigns
      .filter((c) => selectedTeam === "all" || c.teamId === selectedTeam)
      .filter((c) => selectedStatus === "all" || c.status === selectedStatus)
      .filter((c) =>
        c.name?.toLowerCase().includes(debouncedSearch.toLowerCase()),
      );

    return sortData(filtered, sortOption);
  }, [campaigns, debouncedSearch, selectedStatus, selectedTeam, sortOption]);

  const openCreateCampaign = () => {
    setIsCreateOpen(true);
  };

  const closeCreateCampaign = () => {
    setIsCreateOpen(false);
  };

  /* -------------------- HANDLERS -------------------- */
  const resetFilters = () => {
    setSearch("");
    setSelectedTeam("all");
    setSelectedStatus("all");
  };

  const handleViewDetails = (campaign: any) => {
    router.push(`/dashboard/campaign/${campaign.id}`);
  };

  if (isError && (error as any)?.response?.status === 403) {
    return <UnauthorizedPage />;
  }

  const rightControls = (
    <Popover open={showFilters} onOpenChange={setShowFilters}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          {t("Filters")}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72">
        <div className="space-y-4">
          <div>
            <label className="text-xs">{t("Team")}</label>
            <TeamSelector
              value={selectedTeam}
              onChange={setSelectedTeam}
              enableAll
            />
          </div>

          <div>
            <label className="text-xs">{t("Status")}</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Statuses")}</SelectItem>
                <SelectItem value="ACTIVE">{t("Active")}</SelectItem>
                <SelectItem value="INACTIVE">{t("Inactive")}</SelectItem>
                <SelectItem value="DRAFT">{t("Draft")}</SelectItem>
                <SelectItem value="SCHEDULED">{t("Scheduled")}</SelectItem>
                <SelectItem value="COMPLETED">{t("Completed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 border-t pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={resetFilters}
            >
              <RotateCcw className="mr-2 h-3 w-3" />
              {t("Reset")}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => setShowFilters(false)}
            >
              {t("Apply")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  const leftControls = (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as CampaignType)}
    >
      <TabsList>
        <TabsTrigger value={CampaignType.WHATSAPP}>
          <MessageSquare className="mr-2 h-4 w-4" />
          {t("Broadcast")}
          <Badge className="ml-2">
            {whatsappQuery.data?.data?.length ?? 0}
          </Badge>
        </TabsTrigger>

        <TabsTrigger value={CampaignType.DRIP}>
          <Send className="mr-2 h-4 w-4" />
          {t("Drip")}
          <Badge className="ml-2">{dripQuery.data?.data?.length ?? 0}</Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <>
      <ListPageLayout
        canCreate
        createLabel={t("Create Campaign")}
        createDisabledText=""
        docsUrl="campaign"
        isLoading={isPending}
        queryKeys={["campaigns"]}
        search={search}
        searchPlaceholder={t("Search campaigns...")}
        tourSteps={[]}
        onCreate={openCreateCampaign}
        onSearchChange={setSearch}
        sortValue={sortOption}
        onSortChange={setSortOption}
        leftControls={leftControls}
        rightControls={rightControls}
        isError={isError}
        onRetry={refetch}
        isEmpty={!isPending && !isError && filteredCampaigns.length === 0}
        emptyTitle="No campaigns found"
        emptyDescription="Try adjusting your filters or create a new campaign."
      >
        <CampaignCardList
          campaigns={filteredCampaigns}
          onEdit={openEditCampaign}
          onView={handleViewDetails}
        />
      </ListPageLayout>
      {isCreateOpen && (
        <CreateCampaignModal
          close={closeCreateCampaign}
          campaignType={activeTab}
        />
      )}
      {selectedCampaignId && campaignByIdQuery?.data && (
        <CreateCampaignModal
          isEdit
          campaign={campaignByIdQuery.data}
          close={() => {
            setSelectedCampaignId(null);
          }}
          campaignType={campaignByIdQuery.data.type}
        />
      )}
    </>
  );
}
