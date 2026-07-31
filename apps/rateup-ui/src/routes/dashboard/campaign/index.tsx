import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Filter, MessageSquare, RotateCcw, Send } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCampaignById, useCampaignData } from "@/backend/campaign/campaign.query";
import UnauthorizedPage from "@/components/404/UnAuthorizedError.tsx";
import InfoButton from "@/components/Button/InfoButton.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import CampaignCard from "@/components/Campaign/CampaignCard.tsx";
import CreateCampaignModal from "@/components/Campaign/CreateCampaignModal.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { CampaignType } from "@/types/enums.ts";
import type { Campaign } from "@/types/global";
import { docsPath } from "@/utils/constants.ts";

export const Route = createFileRoute("/dashboard/campaign/")({
  component: CampaignsPage,
});

function CampaignsPage() {
  const uid = useId();
  const { t } = useTranslation("campaign.list");
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<CampaignType>(CampaignType.WHATSAPP);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const campaignByIdQuery = useCampaignById(selectedCampaignId ?? "");
  const whatsappQuery = useCampaignData(CampaignType.WHATSAPP);
  const dripQuery = useCampaignData(CampaignType.DRIP);

  const activeQuery = activeTab === CampaignType.WHATSAPP ? whatsappQuery : dripQuery;

  const { data, isPending, isError, error, refetch } = activeQuery;

  const openEditCampaign = (campaign: Campaign) => {
    setSelectedCampaignId(campaign.id);
  };

  const debouncedSearch = useDebounce(search.trim(), 200);

  const campaigns = data?.data ?? [];
  const filteredCampaigns = useMemo(() => {
    const filtered = campaigns
      .filter((c: Campaign) => selectedTeam === "all" || c.teamId === selectedTeam)
      .filter((c: Campaign) => selectedStatus === "all" || c.status === selectedStatus)
      .filter((c: Campaign) => c.name?.toLowerCase().includes(debouncedSearch.toLowerCase()));

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

  const handleViewDetails = (campaign: Campaign) => {
    navigate({
      to: `/dashboard/campaign/${campaign.id}`,
    });
  };

  if (isError && error?.response?.status === 403) {
    return <UnauthorizedPage />;
  }

  const rightControls = (
    <Popover open={showFilters} onOpenChange={setShowFilters}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <Filter className="mr-2 h-4 w-4" />
        {t("Filters")}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72">
        <div className="space-y-4">
          <div>
            <FieldTitle className="text-xs">{t("Team")}</FieldTitle>
            <TeamSelector value={selectedTeam} onChange={setSelectedTeam} enableAll />
          </div>

          <Field>
            <FieldLabel htmlFor={`${uid}-field`} className="text-xs">
              {t("Status")}
            </FieldLabel>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value ?? "")}
              items={[
                { value: "all", label: t("All Statuses") },
                { value: "ACTIVE", label: t("Active") },
                { value: "INACTIVE", label: t("Inactive") },
                { value: "DRAFT", label: t("Draft") },
                { value: "SCHEDULED", label: t("Scheduled") },
                { value: "COMPLETED", label: t("Completed") },
              ]}
            >
              <SelectTrigger id={`${uid}-field`} className="h-9">
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
          </Field>

          <div className="flex gap-2 border-t pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={resetFilters}>
              <RotateCcw className="mr-2 h-3 w-3" />
              {t("Reset")}
            </Button>
            <Button size="sm" className="flex-1" onClick={() => setShowFilters(false)}>
              {t("Apply")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  const leftControls = (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CampaignType)}>
      <TabsList>
        <TabsTrigger value={CampaignType.WHATSAPP}>
          <MessageSquare className="mr-2 h-4 w-4" />
          {t("Broadcast")}
          <Badge className="ml-2">{whatsappQuery.data?.data?.length ?? 0}</Badge>
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
      <ListPage>
        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            <Button onClick={openCreateCampaign} disabled={isPending}>
              {t("Create Campaign")}
            </Button>
            <InfoButton docUrl={`${docsPath}/campaign`} />
            <RefreshButton queryKeys={["campaigns"]} />
          </ListPageHeaderSection>

          <ListPageHeaderSection>
            <ListPageSearchInput
              placeholder={t("Search campaigns...")}
              value={search}
              onChange={setSearch}
            />
            <ListPageSortDropdown value={sortOption} onChange={setSortOption} />
            {leftControls}
            {rightControls}
          </ListPageHeaderSection>
        </ListPageHeader>

        <ListPageContent
          isLoading={isPending}
          isError={isError}
          isEmpty={!isPending && !isError && filteredCampaigns.length === 0}
          emptyTitle={t("No campaigns found")}
          emptyDescription={t("Try adjusting your filters or create a new campaign.")}
          onRetry={refetch}
        >
          <CardGrid
            items={filteredCampaigns}
            getKey={(campaign) => campaign.id}
            renderItem={(campaign) => (
              <CampaignCard
                campaign={campaign}
                onEdit={openEditCampaign}
                onView={handleViewDetails}
              />
            )}
          />
        </ListPageContent>
      </ListPage>

      {isCreateOpen && <CreateCampaignModal close={closeCreateCampaign} campaignType={activeTab} />}
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
