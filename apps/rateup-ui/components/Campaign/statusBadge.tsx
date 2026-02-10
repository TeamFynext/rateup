import { CampaignParticipantStatus } from "@/types/enums";
import { Badge } from "@/components/ui/badge";

import { getStatusBadgeStyle } from "./utils";

interface StatusBadgeProps {
  status: CampaignParticipantStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${getStatusBadgeStyle(status)}`}
    >
      {status}
    </Badge>
  );
}
