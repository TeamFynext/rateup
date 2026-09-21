import { IconCircleCheck, IconCircleX, IconClock, IconSend } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";

interface CampaignPerformanceProps {
  data: {
    sent: number;
    delivered: number;
    read: number;
    pending: number;
    failed: number;
  };
}

export function CampaignPerformance({ data }: CampaignPerformanceProps) {
  const { t } = useTranslation("campaign.performance");
  const { sent, delivered, read, pending, failed } = data;

  const percent = (value: number) => (sent > 0 ? ((value / sent) * 100).toFixed(1) : "0.0");

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg text-muted-foreground">{t("Campaign Performance")}</h2>
        <Badge variant="outline" className="text-xs">
          {t("Last updated: Just now")}
        </Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Sent */}
        <MetricCard
          icon={<IconSend className="w-5 h-5 text-primary" />}
          value={sent}
          label={t("Sent")}
          badge="100%"
          badgeColor={"sent"}
          iconColor={"sentBadge"}
        />

        {/* Delivered */}
        <MetricCard
          icon={<IconCircleCheck className="w-5 h-5 text-green-600" />}
          value={delivered}
          label={t("Delivered")}
          badge={`${percent(delivered)}%`}
          badgeColor={"delivered"}
          iconColor={"delBadge"}
        />

        {/* Read */}
        <MetricCard
          icon={<IconCircleCheck className="w-5 h-5 text-emerald-600" />}
          value={read}
          label={t("Read")}
          badge={`${percent(read)}%`}
          badgeColor={"read"}
          iconColor={"readBadge"}
        />

        {/* Pending */}
        <MetricCard
          icon={<IconClock className="w-5 h-5 text-amber-600" />}
          value={pending}
          label={t("Pending")}
          badge={pending.toString()}
          badgeColor={"pending"}
          iconColor={"pendingBadge"}
        />

        {/* Failed */}
        <MetricCard
          icon={<IconCircleX className="w-5 h-5 text-destructive" />}
          value={failed}
          label={t("Failed")}
          badge={`${percent(failed)}%`}
          badgeColor={"failed"}
          iconColor={"faildBadge"}
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  badge: string;
  color?: "primary" | "green" | "emerald" | "amber" | "red";
  badgeColor: "sent" | "delivered" | "read" | "pending" | "failed";
  iconColor: "sentBadge" | "delBadge" | "readBadge" | "pendingBadge" | "faildBadge";
}

function MetricCard({ icon, value, label, badge, color, badgeColor, iconColor }: MetricCardProps) {
  const colorMap = {
    primary:
      "text-primary border-primary/20 " +
      "bg-linear-to-br from-ru-blue-50 to-white " +
      "dark:from-blue-950/40 dark:to-background " +
      "hover:shadow-md transition-all group",

    green:
      "text-green-600 dark:text-green-400 border-green-200 dark:border-green-900 " +
      "bg-linear-to-br from-green-50 to-white " +
      "dark:from-green-950/40 dark:to-background " +
      "hover:shadow-md transition-all group",

    emerald:
      "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 " +
      "bg-linear-to-br from-emerald-50 to-white " +
      "dark:from-emerald-950/40 dark:to-background " +
      "hover:shadow-md transition-all group",

    amber:
      "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 " +
      "bg-linear-to-br from-amber-50 to-white " +
      "dark:from-amber-950/40 dark:to-background " +
      "hover:shadow-md transition-all group",

    red:
      "text-destructive border-destructive/30 " +
      "bg-linear-to-br from-red-50 to-white " +
      "dark:from-red-950/40 dark:to-background " +
      "hover:shadow-md transition-all group",
  };

  const badgeColrMap = {
    sent: "bg-primary/10 text-primary text-xs border-0",
    delivered:
      "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 text-xs border-0",
    read: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs border-0",
    pending:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-xs border-0",
    failed: "bg-destructive/10 text-destructive text-xs border-0",
  };

  const iconColrMap = {
    sentBadge:
      "w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors",
    delBadge:
      "w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950/50 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/60 transition-colors",
    readBadge:
      "w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/60 transition-colors",
    pendingBadge:
      "w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-900/60 transition-colors",
    faildBadge:
      "w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/15 transition-colors",
  };
  return (
    <Card className={` ${colorMap[color ?? "primary"]}`}>
      <CardContent>
        <div className="flex items-start justify-between mb-3">
          <div className={`${iconColrMap[iconColor]}`}>{icon}</div>

          <Badge variant="secondary" className={`${badgeColrMap[badgeColor]}`}>
            {badge}
          </Badge>
        </div>

        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-3xl mb-1">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}
