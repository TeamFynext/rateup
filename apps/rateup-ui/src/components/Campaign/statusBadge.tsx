"use client";

import { AlertCircle } from "lucide-react";

import { CampaignParticipantStatus } from "@/types/enums.ts";
import { Badge } from "@/components/ui/badge.tsx";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card.tsx";
import { getStatusBadgeStyle } from "./utils.ts";

interface StatusBadgeProps {
  status: CampaignParticipantStatus;
  errorMessage?: string;
}

export function StatusBadge({
  status,
  errorMessage,
}: Readonly<StatusBadgeProps>) {
  const badge = (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${getStatusBadgeStyle(status)}`}
    >
      {status}
    </Badge>
  );

  if (status === CampaignParticipantStatus.FAILED && errorMessage) {
    return (
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <span className="cursor-default">{badge}</span>
        </HoverCardTrigger>
        <HoverCardContent className="w-64">
          <div className="flex items-center gap-1 mb-1">
            <AlertCircle className="size-3 text-destructive" />
            <span className="text-xs font-semibold text-destructive">
              Sending Failed
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {errorMessage}
          </p>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return badge;
}
