import { IconMessageStar } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { LoyaltyReward } from "@/backend/loyalty/reward.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";

import { LOYALTY_PATHS } from "../paths.ts";

/**
 * Review rewards, read-only. They are created and attached under Feedback, where the rule
 * that grants them lives; listing them here keeps the Rewards page an honest inventory.
 */
export function ReviewRewardsTab({ rewards }: Readonly<{ rewards: LoyaltyReward[] }>) {
  const { t } = useTranslation();

  const manage = (
    <Button
      variant="outline"
      size="sm"
      render={<Link to={LOYALTY_PATHS.feedback} search={{ tab: "settings", page: 1 }} />}
    >
      <IconMessageStar size={16} />
      {t("Manage under Feedback")}
    </Button>
  );

  if (rewards.length === 0) {
    return (
      <Empty className="rounded-lg border border-dashed py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconMessageStar />
          </EmptyMedia>
          <EmptyTitle>{t("No review reward yet")}</EmptyTitle>
          <EmptyDescription>
            {t(
              "A review reward thanks a customer for leaving a Google review after the feedback survey. It costs no points and is granted once per customer.",
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>{manage}</EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t(
            "Granted once per customer when they tap the Google review link in the feedback flow. Not redeemable with points.",
          )}
        </p>
        {manage}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rewards.map((reward) => (
          <Card key={reward.id}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{reward.name}</p>
                {reward.description && (
                  <p className="text-sm text-muted-foreground">{reward.description}</p>
                )}
              </div>
              <Badge variant={reward.status === "ACTIVE" ? "secondary" : "outline"}>
                {reward.status === "ACTIVE" ? t("Active") : t("Inactive")}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
