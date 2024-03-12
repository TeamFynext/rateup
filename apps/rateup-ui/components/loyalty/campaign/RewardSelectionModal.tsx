import {
  Stack,
  Group,
  Button,
  Divider,
  Text,
  Modal,
  Table,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CreateRewardModal } from "../reward/CreateRewardModal";
import { useRewards } from "../../../backend/loyalty/reward/reward.query";
import { RewardTypeBadge } from "../reward/RewardTypeBadge";
import RateupLoader from "../../Loaders/RateupLoader";

export function RewardSelectionModal({ setReward, opened, close }) {
  const [createROpened, { open: createROpen, close: CreateRClose }] =
    useDisclosure(false);

  const { data: rewards, isLoading, isError, error } = useRewards(true);

  function handleSetRewardId(rewardId) {
    setReward(rewardId);
    close();
  }

  if (isError) {
    console.error(error);
    return;
  } else if (isLoading) {
    return <RateupLoader />;
  }
  return (
    <Modal opened={opened} onClose={close} title="Select Reward" size="md">
      <Stack>
        <Stack bg="whitesmoke">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rewards.map((reward) => {
                return (
                  <Table.Tr key={reward.id}>
                    <Table.Td>{reward.name}</Table.Td>
                    <Table.Td>
                      <RewardTypeBadge type={reward.type} />
                    </Table.Td>
                    <Table.Td>
                      <Button
                        onClick={() => {
                          handleSetRewardId(reward.id);
                        }}
                      >
                        Select
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Stack>
        <Group>
          <Divider
            style={{
              flexGrow: 1,
            }}
          />
          <Text style={{ alignSelf: "center" }}>OR</Text>
          <Divider
            style={{
              flexGrow: 1,
            }}
          />
        </Group>
        <Button onClick={createROpen}>Create New Reward</Button>
      </Stack>
      <CreateRewardModal opened={createROpened} close={CreateRClose} />
    </Modal>
  );
}
