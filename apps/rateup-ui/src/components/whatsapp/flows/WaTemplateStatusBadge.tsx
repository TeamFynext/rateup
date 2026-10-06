import { useTranslation } from "react-i18next";

import { DotBadge } from "@/components/dashboard/analytics/kit/StatusBadges.tsx";
import { WaFlowStatus } from "@/types/enums.ts";

const DOT: Record<WaFlowStatus, string> = {
  [WaFlowStatus.PUBLISHED]: "bg-green-500",
  [WaFlowStatus.DRAFT]: "bg-muted-foreground/50",
  [WaFlowStatus.DEPRECATED]: "bg-muted-foreground/50",
  [WaFlowStatus.THROTTLED]: "bg-amber-500",
  [WaFlowStatus.BLOCKED]: "bg-destructive",
};

export default function WaFlowStatusBadge({ status }: Readonly<{ status: WaFlowStatus }>) {
  const { t } = useTranslation();
  const labels: Record<WaFlowStatus, string> = {
    [WaFlowStatus.PUBLISHED]: t("Active"),
    [WaFlowStatus.DRAFT]: t("Draft"),
    [WaFlowStatus.DEPRECATED]: t("Deprecated"),
    [WaFlowStatus.THROTTLED]: t("Throttled"),
    [WaFlowStatus.BLOCKED]: t("Blocked"),
  };
  return (
    <DotBadge
      dotClassName={DOT[status] ?? "bg-muted-foreground/50"}
      label={labels[status] ?? status}
    />
  );
}
