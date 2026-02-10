"use client";

import { useTranslations } from "next-intl";

import { CampaignParticipantStatus } from "@/types/enums";
import { Badge } from "@/components/ui/badge";

import { getStatusBadgeStyle } from "./utils";

interface StatusBadgeProps {
  status: CampaignParticipantStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("campaign.statusBadge");
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${getStatusBadgeStyle(status)}`}
    >
      {t(`statuses.${status}`)}
    </Badge>
  );
}
