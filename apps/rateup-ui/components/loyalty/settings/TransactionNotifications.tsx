"use client";

import { Bell } from "lucide-react";
import { useExtracted } from "next-intl";
import { UseFormReturn } from "react-hook-form";

import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { EventTriggerItem } from "./EventTriggerItem";
import { LoyaltyTemplateTypes } from "./utils";

interface TransactionNotificationsProps {
  form: UseFormReturn<any>;
  isPending: boolean;
  onToggle: (eventType: LoyaltyEventType, enabled: boolean) => void;
  onSavePointsIssued: () => void;
  onSavePointsAdjusted: () => void;
  onSaveRewardIssued: () => void;
  onSaveRewardRedeemed: () => void;
  pointsIssuedModified: boolean;
  pointsAdjustedModified: boolean;
  rewardIssuedModified: boolean;
  rewardRedeemedModified: boolean;
  setPointsIssuedModified: (val: boolean) => void;
  setPointsAdjustedModified: (val: boolean) => void;
  setRewardIssuedModified: (val: boolean) => void;
  setRewardRedeemedModified: (val: boolean) => void;
}

export function TransactionNotifications({
  form,
  isPending,
  onToggle,
  onSavePointsIssued,
  onSavePointsAdjusted,
  onSaveRewardIssued,
  onSaveRewardRedeemed,
  pointsIssuedModified,
  pointsAdjustedModified,
  rewardIssuedModified,
  rewardRedeemedModified,
  setPointsIssuedModified,
  setPointsAdjustedModified,
  setRewardIssuedModified,
  setRewardRedeemedModified,
}: TransactionNotificationsProps) {
  const t = useExtracted();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          {t("Transaction Notifications")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EventTriggerItem
            form={form}
            eventType={LoyaltyEventType.POINTS_ISSUED}
            templateType={LoyaltyTemplateTypes.PointsIssued}
            title={t("Points Earned")}
            description={t("Notify on purchase points")}
            isModified={pointsIssuedModified}
            onModify={() => setPointsIssuedModified(true)}
            onSave={onSavePointsIssued}
            onToggle={(val) => onToggle(LoyaltyEventType.POINTS_ISSUED, val)}
            isPending={isPending}
          />

          <EventTriggerItem
            form={form}
            eventType={LoyaltyEventType.POINTS_ADJUSTED}
            templateType={LoyaltyTemplateTypes.PointsAdjusted}
            title={t("Points Adjusted")}
            description={t("Notify on manual adjustments")}
            isModified={pointsAdjustedModified}
            onModify={() => setPointsAdjustedModified(true)}
            onSave={onSavePointsAdjusted}
            onToggle={(val) => onToggle(LoyaltyEventType.POINTS_ADJUSTED, val)}
            isPending={isPending}
          />

          <EventTriggerItem
            form={form}
            eventType={LoyaltyEventType.REWARD_ISSUED}
            templateType={LoyaltyTemplateTypes.RewardIssued}
            title={t("Reward Assigned")}
            description={t("Notify on manual reward grant")}
            isModified={rewardIssuedModified}
            onModify={() => setRewardIssuedModified(true)}
            onSave={onSaveRewardIssued}
            onToggle={(val) => onToggle(LoyaltyEventType.REWARD_ISSUED, val)}
            isPending={isPending}
          />

          <EventTriggerItem
            form={form}
            eventType={LoyaltyEventType.REWARD_REDEEMED}
            templateType={LoyaltyTemplateTypes.RewardRedeemed}
            title={t("Reward Redeemed")}
            description={t("Confirm successful redemption")}
            isModified={rewardRedeemedModified}
            onModify={() => setRewardRedeemedModified(true)}
            onSave={onSaveRewardRedeemed}
            onToggle={(val) => onToggle(LoyaltyEventType.REWARD_REDEEMED, val)}
            isPending={isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}
