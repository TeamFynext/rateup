import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils";

/** One badge shape for every status in the section: an outline chip with a dot whose colour carries the state. */
export function DotBadge({
  dotClassName,
  label,
}: Readonly<{ dotClassName: string; label: string }>) {
  return (
    <Badge variant="outline" className="gap-1.5 font-normal text-foreground">
      <span className={cn("size-1.5 rounded-full", dotClassName)} aria-hidden />
      {label}
    </Badge>
  );
}

export function StaffStatusBadge({ status }: Readonly<{ status?: string | null }>) {
  const { t } = useTranslation();
  switch (status?.toLowerCase()) {
    case "online":
    case "available":
      return <DotBadge dotClassName="bg-green-500" label={t("Online")} />;
    case "busy":
      return <DotBadge dotClassName="bg-amber-500" label={t("Busy")} />;
    case "away":
      return <DotBadge dotClassName="bg-amber-300" label={t("Away")} />;
    default:
      return <DotBadge dotClassName="bg-muted-foreground/50" label={t("Offline")} />;
  }
}

export function MessageStatusBadge({ status }: Readonly<{ status?: string | null }>) {
  const { t } = useTranslation();
  switch (status?.toLowerCase()) {
    case "read":
      return <DotBadge dotClassName="bg-primary" label={t("Read")} />;
    case "delivered":
      return <DotBadge dotClassName="bg-green-500" label={t("Delivered")} />;
    case "sent":
      return <DotBadge dotClassName="bg-chart-3" label={t("Sent")} />;
    case "failed":
      return <DotBadge dotClassName="bg-destructive" label={t("Failed")} />;
    default:
      return <DotBadge dotClassName="bg-muted-foreground/50" label={t("Pending")} />;
  }
}

export function ConversationStatusBadge({ status }: Readonly<{ status?: string | null }>) {
  const { t } = useTranslation();
  switch (status?.toUpperCase()) {
    case "RESOLVED":
      return <DotBadge dotClassName="bg-green-500" label={t("Resolved")} />;
    case "CLOSED":
      return <DotBadge dotClassName="bg-green-500" label={t("Closed")} />;
    case "ASSIGNED":
      return <DotBadge dotClassName="bg-primary" label={t("In progress")} />;
    case "UNASSIGNED":
      return <DotBadge dotClassName="bg-amber-500" label={t("Unassigned")} />;
    case "UNRESOLVED":
      return <DotBadge dotClassName="bg-amber-500" label={t("Unresolved")} />;
    default:
      return <DotBadge dotClassName="bg-muted-foreground/50" label={status ?? "—"} />;
  }
}

/** Where a message came from. Identity, not state, so no colour. */
export function MessageSourceBadge({ source }: Readonly<{ source?: string | null }>) {
  const { t } = useTranslation();
  const labels: Record<string, string> = {
    campaign: t("Campaign"),
    template: t("Template"),
    inbox: t("Inbox"),
    external: t("External API"),
  };
  const label = source ? (labels[source.toLowerCase()] ?? source) : t("Unknown");
  return (
    <Badge variant="secondary" className="font-normal">
      {label}
    </Badge>
  );
}
