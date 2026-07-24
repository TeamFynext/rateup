import { AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge.tsx";
import { CampaignParticipantStatus } from "@/types/enums.ts";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card.tsx";
import { getStatusBadgeStyle } from "./utils.ts";

interface StatusBadgeProps {
  status: CampaignParticipantStatus;
  errorMessage?: string;
}

export function StatusBadge({ status, errorMessage }: Readonly<StatusBadgeProps>) {
  const isFailed = status === CampaignParticipantStatus.FAILED && errorMessage;

  const badge = (
    <Badge
      variant="outline"
      // Delivery status flips while a campaign sends, so announce the change in place.
      role="status"
      aria-label={isFailed ? `${status}: ${errorMessage}` : undefined}
      className={`text-xs font-medium ${getStatusBadgeStyle(status)}`}
    >
      {status}
    </Badge>
  );

  if (isFailed) {
    return (
      <HoverCard>
        {/* tabIndex keeps the failure reason reachable without a pointer. */}
        <HoverCardTrigger delay={200} render={<span tabIndex={0} className="cursor-default" />}>
          {badge}
        </HoverCardTrigger>
        <HoverCardContent className="w-64">
          <div className="flex items-center gap-1 mb-1">
            <AlertCircle className="size-3 text-destructive" />
            <span className="text-xs font-semibold text-destructive">Sending Failed</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{errorMessage}</p>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return badge;
}
