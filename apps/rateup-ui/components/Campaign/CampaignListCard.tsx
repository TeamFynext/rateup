"use client";

import CampaignCard from "./CampaignCard";

interface CampaignCardListProps {
  campaigns: any[];
  onView: (campaign: any) => void;
  onEdit: (campaign: any) => void;
  isLoading?: boolean;
}

export default function CampaignCardList({
  campaigns,
  onView,
  onEdit,
  isLoading = false,
}: CampaignCardListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
        <div className="text-slate-600 dark:text-slate-400">
          Loading campaigns...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onView={onView}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}
