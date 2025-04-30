import { useState } from "react";
import { useRouter } from "next/router";

import { Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";

import { useSubscription } from "@/backend/subscription/subscription.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";
import NothingFound from "@/components/NothingFound/NothingFound";
import useTranslations from "@/dictionaries/useTranslation";

import { useGetLoyaltyRewards } from "../../../../backend/loyalty/reward/reward.query";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import { RewardCard } from "../../../../components/LoyaltyComponents/Rewards/RewardCard";

enum rewardSortData {
  defaultPointsOrder = "Default Points Order",
  highToLowPoints = "Hight to Low Points",
  lowToHighPoints = "Low to High Points",
}

export default function Reward() {
  const router = useRouter();

  const { data: rewards, isLoading, isError, error } = useGetLoyaltyRewards();
  const { translations } = useTranslations();

  const {
    data: subscription,
    isLoading: isSubscriptionLoading,
    refetch,
  } = useSubscription();

  const [selectedOrder, setSelectedOrder] = useState(
    rewardSortData.defaultPointsOrder,
  );

  if (isError) {
    console.error(error);
    return;
  } else if (isLoading || !rewards || isSubscriptionLoading) {
    return <RateupLoader />;
  }

  if (
    !subscription?.features?.loyalty?.active ||
    !subscription?.features?.loyalty?.reward?.active
  )
    return <ErrorComponent refetch={refetch} />;

  const rewardsCopy = [...rewards];

  const sortedRewards =
    selectedOrder === rewardSortData.defaultPointsOrder
      ? rewards
      : rewardsCopy?.sort((a, b) =>
          selectedOrder === rewardSortData.highToLowPoints
            ? b.points - a.points
            : a.points - b.points,
        );

  return (
    <Stack p={"xs"}>
      <Group justify="space-between">
        <Group>
          <RateupButtonBlue
            title={translations["New Reward"]}
            rightIcon={<IconPlus />}
            onClick={() => router.push("/dashboard/loyalty/rewards/create")}
          />
        </Group>
        <ContainedSelection
          data={Object.values(rewardSortData)}
          value={selectedOrder}
          onChange={(value) => setSelectedOrder(value as rewardSortData)}
        />
      </Group>
      {rewards?.length ? (
        <SimpleGrid cols={3}>
          {sortedRewards?.map((reward) => (
            <RewardCard key={reward.id} reward={reward} />
          ))}
        </SimpleGrid>
      ) : (
        <NothingFound
          text={`${translations["No Rewards found"]}. ${translations["Click New Reward to create a reward"]}`}
        />
      )}
    </Stack>
  );
}
