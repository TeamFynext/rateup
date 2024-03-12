import { Button, Flex, Group, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { CreateRewardModal } from "../../../../components/loyalty/reward/CreateRewardModal";
import { useRewards } from "../../../../backend/loyalty/reward/reward.query";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import { RewardCard } from "../../../../components/loyalty/reward/RewardCard";

export default function () {
  const [opened, { open, close }] = useDisclosure(false);

  const { data: rewards, isLoading, isError, error } = useRewards(true);

  if (isError) {
    console.error(error);
    return;
  } else if (isLoading || !rewards) {
    return <RateupLoader />;
  }

  return (
    <Stack>
      <Group>
        <Title order={2}>Loyalty Rewards</Title>
        <Button onClick={open} leftSection={<IconPlus />}>
          Create Reward
        </Button>
      </Group>
      <Flex wrap={"wrap"} gap={"md"}>
        {rewards.map((reward) => (
          <RewardCard key={reward.id} reward={reward} />
        ))}
      </Flex>
      <CreateRewardModal opened={opened} close={close} />
    </Stack>
  );
}
