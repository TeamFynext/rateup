"use client";

import { GenericCardGrid } from "@/components/common/generic-card";

import CampaignCard, { Campaign } from "./CampaignCard";

interface CampaignCardListProps {
  readonly campaigns: Campaign[];
  readonly onView: (campaign: Campaign) => void;
  readonly onEdit: (campaign: Campaign) => void;
}

export default function CampaignCardList({
  campaigns,
  onView,
  onEdit,
}: CampaignCardListProps) {
  return (
    <GenericCardGrid
      items={campaigns}
      getKey={(campaign) => campaign.id}
      renderItem={(campaign) => (
        <CampaignCard campaign={campaign} onView={onView} onEdit={onEdit} />
      )}
    />
  );
}
