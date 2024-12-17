import { useState } from "react";

import { Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";

import { useSubscription } from "@/backend/subscription/subscription.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";
import NothingFound from "@/components/NothingFound/NothingFound";

import { useGetLoyaltyRewards } from "../../../../backend/loyalty/reward/reward.query";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import { CreateRewardModal } from "../../../../components/loyalty/reward/CreateRewardModal";
import { RewardCard } from "../../../../components/loyalty/reward/RewardCard";

enum rewardSortData {
  defaultPointsOrder = "Default Points Order",
  highToLowPoints = "Hight to Low Points",
  lowToHighPoints = "Low to High Points",
}

export default function () {
  const [opened, { open, close }] = useDisclosure(false);

  const { data: rewards, isLoading, isError, error } = useGetLoyaltyRewards();

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
    <Stack>
      <Group justify="space-between">
        <Group>
          {/* <Title>Rewards</Title> */}
          <RateupButtonBlue
            title="New Reward"
            rightIcon={<IconPlus />}
            onClick={open}
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
          text={"No Rewards found. Click New Reward to create a reward"}
        />
      )}
      <CreateRewardModal opened={opened} close={close} />
    </Stack>
  );
}
