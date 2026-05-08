import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type ChannelStatus = "connected" | "pending" | "disconnected";

export function getWaStatus(
  isLoading: boolean,
  waConnected: boolean,
): ChannelStatus {
  if (isLoading) return "pending";
  return waConnected ? "connected" : "disconnected";
}

export function getIgStatus(
  isLoading: boolean,
  igConnected: boolean,
  waConnected: boolean,
): ChannelStatus {
  if (isLoading) return "pending";
  if (igConnected) return "connected";
  return waConnected ? "pending" : "disconnected";
}

export function getFbStatus(
  isLoading: boolean,
  fbConnected: boolean,
  waConnected: boolean,
): ChannelStatus {
  if (isLoading) return "pending";
  if (fbConnected) return "connected";
  return waConnected ? "pending" : "disconnected";
}

function getBadgeVariant(status: ChannelStatus) {
  return status === "connected" ? "default" : "secondary";
}

function getBadgeClassName(status: ChannelStatus) {
  if (status === "connected") {
    return "bg-green-600 text-white hover:bg-green-600";
  }
  if (status === "pending") {
    return "bg-amber-100 text-amber-700 hover:bg-amber-100";
  }
  return "bg-gray-200 text-gray-700 hover:bg-gray-200";
}

type ChannelOverviewCardProps = Readonly<{
  icon: ReactNode;
  title: string;
  description: string;
  status: ChannelStatus;
  isLoading: boolean;
  actionLabel: string;
  actionVariant?: "default" | "outline";
  onAction: () => void;
  actionDisabled?: boolean;
  helperText?: string;
  summary?: ReactNode;
}>;

export function ChannelOverviewCard({
  icon,
  title,
  description,
  status,
  isLoading,
  actionLabel,
  actionVariant = "default",
  onAction,
  actionDisabled = false,
  helperText,
  summary,
}: ChannelOverviewCardProps) {
  return (
    <Card className="group gap-0 overflow-hidden border-border transition-colors hover:border-primary/40">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-muted/40 text-primary transition-colors group-hover:bg-accent">
          {icon}
        </div>
        <Badge
          variant={getBadgeVariant(status)}
          className={getBadgeClassName(status)}
        >
          {isLoading ? "loading" : status}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-5 pb-4">
        <CardTitle className="mb-2 text-base">{title}</CardTitle>
        <CardDescription className="flex-1 text-sm leading-6">
          {description}
        </CardDescription>
        {helperText ? (
          <div className="mt-4 border-t pt-4 text-xs text-amber-600">
            {helperText}
          </div>
        ) : null}
        {summary ? (
          <div className="mt-4 border-t pt-4 text-xs text-muted-foreground">
            {summary}
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="px-5 pb-5 pt-0">
        <Button
          variant={actionVariant}
          size="sm"
          className="w-full"
          disabled={actionDisabled}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
