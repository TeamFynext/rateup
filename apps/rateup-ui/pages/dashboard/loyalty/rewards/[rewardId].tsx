import React, { useEffect } from "react";
import { useRouter } from "next/router";

import { useTranslations } from "next-intl";

import {
  useGetLoyaltyRewardById,
  useGetLoyaltyRewards,
} from "@/backend/loyalty/reward/reward.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import LoyaltyRewardForm from "@/components/LoyaltyComponents/Rewards/LoyaltyRewardForm";
import { useRouteParams } from "@/context/RouteParamsContext";

const RewardID = () => {
  const router = useRouter();
  const { rewardId } = router.query as { rewardId: string };
  const { update } = useRouteParams();
  const translations = useTranslations();

  const { data: reward, isLoading: isRewardLoading } = useGetLoyaltyRewardById(
    rewardId !== "create" ? rewardId : null,
  );
  const { data: loyaltyRewards, isLoading } = useGetLoyaltyRewards(
    rewardId === "create" || !reward?.reward_id,
  );

  const existingRewardIds = loyaltyRewards
    ? loyaltyRewards.filter((a) => a.reward_id).map((a) => a.reward_id)
    : [];

  useEffect(() => {
    update({ rewardId: reward?.name });
  }, [reward]);

  if (isRewardLoading || isLoading) return <RateupLoader />;

  return (
    <LoyaltyRewardForm
      reward={reward}
      existingRewardIds={existingRewardIds}
      title={reward ? reward.name : translations("Create Reward")}
    />
  );
};

export default RewardID;
