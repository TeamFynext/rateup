import { CheckCircle, Clock, Send, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
  const t = useTranslations("campaign.performance");
  const { sent, delivered, read, pending, failed } = data;

  const percent = (value: number) =>
    sent > 0 ? ((value / sent) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg text-muted-foreground">{t("title")}</h2>
        <Badge variant="outline" className="text-xs">
          {t("lastUpdated")}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Sent */}
        <MetricCard
          icon={<Send className="w-5 h-5 text-primary" />}
          value={sent}
          label={t("metrics.sent")}
          badge="100%"
          badgeColor={"sent"}
          iconColor={"sentBadge"}
        />

        {/* Delivered */}
        <MetricCard
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          value={delivered}
          label={t("metrics.delivered")}
          badge={`${percent(delivered)}%`}
          badgeColor={"delivered"}
          iconColor={"delBadge"}
        />

        {/* Read */}
        <MetricCard
          icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
          value={read}
          label={t("metrics.read")}
          badge={`${percent(read)}%`}
          badgeColor={"read"}
          iconColor={"readBadge"}
        />

        {/* Pending */}
        <MetricCard
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          value={pending}
          label={t("metrics.pending")}
          badge={pending.toString()}
          badgeColor={"pending"}
          iconColor={"pendingBadge"}
        />

        {/* Failed */}
        <MetricCard
          icon={<XCircle className="w-5 h-5 text-red-600" />}
          value={failed}
          label={t("metrics.failed")}
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
  iconColor:
    | "sentBadge"
    | "delBadge"
    | "readBadge"
    | "pendingBadge"
    | "faildBadge";
}

function MetricCard({
  icon,
  value,
  label,
  badge,
  color,
  badgeColor,
  iconColor,
}: MetricCardProps) {
  const colorMap = {
    primary:
      "text-primary border-[#2E5BFF]/20 " +
      "bg-linear-to-br from-blue-50 to-white " +
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
      "text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 " +
      "bg-linear-to-br from-red-50 to-white " +
      "dark:from-red-950/40 dark:to-background " +
      "hover:shadow-md transition-all group",
  };

  const badgeColrMap = {
    sent: "bg-[#2E5BFF]/10 text-[#2E5BFF] text-xs border-0",
    delivered: "bg-green-100 text-green-700 text-xs border-0",
    read: "bg-emerald-100 text-emerald-700 text-xs border-0",
    pending: "bg-amber-100 text-amber-700 text-xs border-0",
    failed: "bg-red-100 text-red-700 text-xs border-0",
  };

  const iconColrMap = {
    sentBadge:
      "w-10 h-10 rounded-lg bg-[#2E5BFF]/10 flex items-center justify-center group-hover:bg-[#2E5BFF]/20 transition-colors",
    delBadge:
      "w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors",
    readBadge:
      "w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors",
    pendingBadge:
      "w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors",
    faildBadge:
      "w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors",
  };
  return (
    <Card className={`hover:shadow-md transition-all ${colorMap[color]}`}>
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
