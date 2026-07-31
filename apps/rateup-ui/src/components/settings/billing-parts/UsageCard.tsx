// Extracted verbatim from `billing.tsx`. Behaviour is unchanged.

import { IconRefresh } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useUsageStats } from "@/backend/stats/stats.query";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";

import { AIStats, LoyaltyStats, SurveyStats, TeamStats, WhatsappStats } from "./PlanStats.tsx";

export function UsageCard({ subscription }: { subscription?: Subscription }) {
  const { t: translations } = useTranslation();
  const { data: stats, refetch, isFetching } = useUsageStats();

  return (
    <Card className="p-6 ">
      <div className="flex items-center justify-between">
        <h3 className="">Usage Stats</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2"
        >
          <IconRefresh
            className={`w-4 h-4 transition-transform ${isFetching ? "animate-spin" : ""}`}
          />
          {translations("Refresh")}
        </Button>
      </div>
      <div className="flex flex-col justify-center gap-4">
        <TeamStats stats={stats} subscription={subscription} />
        <SurveyStats stats={stats} subscription={subscription} />
        <WhatsappStats stats={stats} subscription={subscription} />
        <AIStats stats={stats} subscription={subscription} />
        <LoyaltyStats stats={stats} subscription={subscription} />
      </div>
    </Card>
  );
}
