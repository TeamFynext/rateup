// Extracted verbatim from the `/dashboard/campaign/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { IconFilter, IconMessage, IconRotate, IconSend } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCampaignData } from "@/backend/campaign/campaign.query";
import { useConversationLimit } from "@/backend/stats/stats.query";
import UnauthorizedPage from "@/components/404/UnAuthorizedError.tsx";
import InfoButton from "@/components/Button/InfoButton.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import CampaignCard, { CampaignProgressLegend } from "@/components/Campaign/CampaignCard.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";
import { PlanUpgradeRequired } from "@/components/common/plan-upgrade-required.tsx";
import {
  CAMPAIGN_STATUS_FILTERS,
  matchesCampaignStatusFilter,
} from "@/components/dashboard/campaign/campaignStatus.tsx";
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
import { CampaignStatus, CampaignType } from "@/types/enums.ts";
import type { Campaign } from "@/types/global";
import { getAccessDenialReason, isPlanDenial } from "@/utils/apiError.ts";
import { docsPath } from "@/utils/constants.ts";

export function CampaignsPage({
  initialStatus,
}: Readonly<{ initialStatus?: CampaignStatus }> = {}) {
  const uid = useId();
  const { t } = useTranslation("campaign.list");
  // Status wording is shared with the badges on the cards, so it lives in its own namespace.
  const { t: tStatus } = useTranslation("campaign.status");
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<CampaignType>(CampaignType.WHATSAPP);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus ?? "all");
  const [showFilters, setShowFilters] = useState(false);
  const whatsappQuery = useCampaignData(CampaignType.WHATSAPP);
  const dripQuery = useCampaignData(CampaignType.DRIP);

  const activeQuery = activeTab === CampaignType.WHATSAPP ? whatsappQuery : dripQuery;
  const conversations = useConversationLimit();

  const { data, isPending, isError, error, refetch } = activeQuery;

  // Edit reopens the wizard on the step that owns what is being changed —
  // "Continue setup" on a draft and "Edit" on a live campaign are the same
  // journey, so they land in the same place.
  const openEditCampaign = (campaign: Campaign) => {
    void navigate({
      to: "/dashboard/campaign/$campaignId/edit",
      params: { campaignId: campaign.id },
      search: { step: campaign.waTemplateId ? "review" : "template" },
    });
  };

  const debouncedSearch = useDebounce(search.trim(), 200);

  const campaigns: Campaign[] = data?.data ?? [];
  const draftCount = campaigns.filter((c) => c.status === CampaignStatus.DRAFT).length;
  const summaryLine = [
    t("{count} campaigns", { count: campaigns.length }),
    draftCount > 0 ? t("{count} drafts", { count: draftCount }) : null,
    conversations.hasLimit
      ? t("{count} conversations left {period}", {
          count: Math.max(conversations.limit - conversations.used, 0).toLocaleString(),
          period: conversations.isAnnual ? t("this year") : t("this month"),
        })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const filteredCampaigns = useMemo(() => {
    const filtered = campaigns
      .filter((c: Campaign) => selectedTeam === "all" || c.teamId === selectedTeam)
      .filter((c: Campaign) => matchesCampaignStatusFilter(c.status, selectedStatus))
      .filter((c: Campaign) => c.name?.toLowerCase().includes(debouncedSearch.toLowerCase()));

    return sortData(filtered, sortOption);
  }, [campaigns, debouncedSearch, selectedStatus, selectedTeam, sortOption]);

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

  // A 403 here is one of two opposite problems, and the API says which. Campaigns are
  // not on the Free plan, so this path is reached far more often by someone who needs
  // to upgrade than by someone who needs a permission — showing "Access Denied" to the
  // first group was both wrong and a dead end.
  const denial = getAccessDenialReason(error);
  if (isError && denial) {
    return isPlanDenial(error) ? (
      <PlanUpgradeRequired feature={t("Campaigns")} reason={denial} />
    ) : (
      <UnauthorizedPage />
    );
  }

  // The filter reads in the same words as the badges on the cards, so picking
  // "Sending" and scanning for it are the same vocabulary. QUEUING/DEQUEUING are
  // left out: they are seconds-long transitions, never a set worth filtering to.
  const statusItems = [
    { value: "all", label: t("All Statuses") },
    ...CAMPAIGN_STATUS_FILTERS.map(({ value, label }) => ({ value, label: tStatus(label) })),
  ];

  const rightControls = (
    <Popover open={showFilters} onOpenChange={setShowFilters}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <IconFilter className="mr-2 h-4 w-4" />
        {t("Filters")}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72">
        <div className="space-y-4">
          <div>
            <FieldTitle className="text-xs">{t("Team")}</FieldTitle>
            {/* `SelectTrigger` is `w-fit` by default, so without this the team control sits at
                its content width while Status — inside a `Field` — stretches to the popover. */}
            <TeamSelector
              value={selectedTeam}
              onChange={setSelectedTeam}
              enableAll
              className="w-full"
            />
          </div>

          <Field>
            <FieldLabel htmlFor={`${uid}-field`} className="text-xs">
              {t("Status")}
            </FieldLabel>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value ?? "")}
              items={statusItems}
            >
              <SelectTrigger id={`${uid}-field`} className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="flex gap-2 border-t pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={resetFilters}>
              <IconRotate className="mr-2 h-3 w-3" />
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
          <IconMessage className="mr-2 h-4 w-4" />
          {t("Broadcast")}
          <Badge className="ml-2">{whatsappQuery.data?.data?.length ?? 0}</Badge>
        </TabsTrigger>

        <TabsTrigger value={CampaignType.DRIP}>
          <IconSend className="mr-2 h-4 w-4" />
          {t("Drip")}
          <Badge className="ml-2">{dripQuery.data?.data?.length ?? 0}</Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <>
      <ListPage>
        {/* The design's title block: what this page is, and the two numbers
            someone opening it is usually here to check. */}
        <div className="flex items-end justify-between gap-5 px-1 pb-1">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-bold tracking-tight">{t("Campaigns")}</h1>
            <p className="text-muted-foreground text-[13px]">{summaryLine}</p>
          </div>
          {/* One key for every card's progress bar, where the eye looks for it. */}
          <CampaignProgressLegend className="justify-end pb-0.5" />
        </div>

        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            {/* Creation is a route now, not a modal: a half-built campaign is
                a real DRAFT with a URL, so it survives a refresh and can be
                picked up again from the list. */}
            <Button render={<Link to="/dashboard/campaign/new" />} disabled={isPending}>
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
    </>
  );
}
