"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Filter,
  MessageSquare,
  Plus,
  RotateCcw,
  Search,
  Send,
} from "lucide-react";

import { CampaignType } from "@/types/enums";
import { useCampaignData } from "@/backend/campaign/campaign.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import UnauthorizedPage from "@/components/404/UnAuthorizedError";
import CampaignCardList from "@/components/Campaign/CampaignListCard";
import CreateCampaignModal from "@/components/Campaign/CreateCampaignModal";
import { TeamSelector } from "@/components/input/TeamSelector";
import useDebounce from "@/components/menu/hook/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const router = useRouter();

  /* -------------------- UI STATE -------------------- */
  const [activeTab, setActiveTab] = useState<CampaignType>(
    CampaignType.WHATSAPP,
  );

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  /* -------------------- DATA -------------------- */
  const whatsappQuery = useCampaignData(CampaignType.WHATSAPP);
  const dripQuery = useCampaignData(CampaignType.DRIP);

  const activeQuery =
    activeTab === CampaignType.WHATSAPP ? whatsappQuery : dripQuery;

  const { data, isPending, isError, error, refetch } = activeQuery;
  const openEditCampaign = (campaign: any) => {
    setEditingCampaign(campaign);
    setIsEditOpen(true);
  };

  /* -------------------- ERROR HANDLING -------------------- */

  if (isError && (error as any)?.response?.status === 403) {
    return <UnauthorizedPage />;
  }

  if (isError) {
    return <ErrorComponent refetch={refetch} />;
  }

  const debouncedSearch = useDebounce(search.trim(), 200);

  /* -------------------- FILTERED DATA -------------------- */
  const campaigns = data?.data ?? [];
  const filteredCampaigns = useMemo(() => {
    return campaigns
      .filter((c) => selectedTeam === "all" || c.teamId === selectedTeam)
      .filter((c) => selectedStatus === "all" || c.status === selectedStatus)
      .filter((c) =>
        c.name?.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [campaigns, debouncedSearch, selectedTeam, selectedStatus]);

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

  /* -------------------- RENDER -------------------- */
  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className=" border-b">
          <div className="px-6 py-4">
            <h1 className="text-2xl">Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage your marketing campaigns
            </p>
          </div>

          {/* Tabs + Actions */}
          <div className="px-6 pb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Button
                className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/90"
                onClick={openCreateCampaign}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>

              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as CampaignType)}
              >
                <TabsList className="">
                  <TabsTrigger value={CampaignType.WHATSAPP}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Broadcast
                    <Badge className="ml-2">
                      {whatsappQuery.data?.data?.length ?? 0}
                    </Badge>
                  </TabsTrigger>

                  <TabsTrigger value={CampaignType.DRIP}>
                    <Send className="w-4 h-4 mr-2" />
                    Drip
                    <Badge className="ml-2">
                      {" "}
                      {dripQuery.data?.data?.length ?? 0}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Search + Filters */}
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search campaigns..."
                  className="pl-9 h-9"
                />
              </div>

              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </PopoverTrigger>

                <PopoverContent align="end" className="w-72">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs">Team</label>
                      <TeamSelector
                        value={selectedTeam}
                        onChange={setSelectedTeam}
                        enableAll
                      />
                    </div>

                    <div>
                      <label className="text-xs">Status</label>
                      <Select
                        value={selectedStatus}
                        onValueChange={setSelectedStatus}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={resetFilters}
                      >
                        <RotateCcw className="w-3 h-3 mr-2" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-[#2E5BFF]"
                        onClick={() => setShowFilters(false)}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Campaign List */}
        <CampaignCardList
          campaigns={filteredCampaigns}
          onEdit={openEditCampaign}
          isLoading={isPending}
          onView={handleViewDetails}
        />
      </div>

      {/* 🔥 MODAL MUST BE HERE */}
      {isCreateOpen && (
        <CreateCampaignModal
          close={closeCreateCampaign}
          campaignType={activeTab}
        />
      )}
      {isEditOpen && editingCampaign && (
        <CreateCampaignModal
          isEdit
          campaign={editingCampaign}
          close={() => {
            setIsEditOpen(false);
            setEditingCampaign(null);
          }}
          campaignType={editingCampaign.type}
        />
      )}
    </>
  );
}
