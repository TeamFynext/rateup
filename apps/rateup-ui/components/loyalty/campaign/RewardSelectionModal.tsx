import {
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { useRewards } from "@/backend/loyalty/reward/reward.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import useTranslations from "@/dictionaries/useTranslation";

import RateupLoader from "../../Loaders/RateupLoader";
import { CreateRewardModal } from "../reward/CreateRewardModal";
import { RewardTypeBadge } from "../reward/RewardTypeBadge";

export function RewardSelectionModal({ setReward, opened, close }) {
  const [createROpened, { open: createROpen, close: CreateRClose }] =
    useDisclosure(false);

  const { data: rewards, isLoading, isError, error } = useRewards(true);
  const { translations } = useTranslations();
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
    <Modal
      opened={opened}
      onClose={close}
      title={translations["Select Reward"]}
      size="md"
    >
      <Stack>
        <Stack bg={"light-dark(whitesmoke,var(--mantine-color-dark-6))"}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{translations["Name"]}</Table.Th>
                <Table.Th>{translations["Type"]}</Table.Th>
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
                      <RateupButtonPrimary
                        onClick={() => {
                          handleSetRewardId(reward.id);
                        }}
                        title={translations["Select"]}
                      />
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
        <RateupButtonPrimary
          onClick={createROpen}
          title={translations["Create New Reward"]}
        />
      </Stack>
      <CreateRewardModal opened={createROpened} close={CreateRClose} />
    </Modal>
  );
}
