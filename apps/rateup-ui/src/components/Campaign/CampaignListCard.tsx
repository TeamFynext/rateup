"use client";

import { GenericCardGrid } from "@/components/common/generic-card.tsx";

import type { Campaign } from "./CampaignCard.tsx";
import CampaignCard from "./CampaignCard.tsx";

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
