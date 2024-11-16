import React, { useState } from "react";

import { Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";

import { LoyaltyActionType } from "@/types/enums";
import { useGetLoyaltyActions } from "@/backend/loyalty/actions/actions.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import CreateNewLoyaltyAction from "@/components/loyalty/actions/CreateNewLoyaltyAction";
import LoyaltyActionCard from "@/components/loyalty/actions/LoyaltyActionCard";
import NothingFound from "@/components/NothingFound/NothingFound";

const index = () => {
  const { data: loyaltyActions, isLoading } = useGetLoyaltyActions();
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedAction, setSelectedAction] = useState("All Actions");

  const actionFilterData = ["All Actions", ...Object.values(LoyaltyActionType)];

  const filteredLoyaltyActions =
    selectedAction === "All Actions"
      ? loyaltyActions
      : loyaltyActions?.filter((action) => action?.type === selectedAction);

  return (
    <Stack>
      <Group justify="space-between">
        <Group>
          <Title>Actions</Title>
          <RateupButtonBlue
            title="New Action"
            rightIcon={<IconPlus />}
            onClick={open}
          />
        </Group>
        <ContainedSelection
          data={actionFilterData}
          onChange={setSelectedAction}
          value={selectedAction}
        />
      </Group>
      {isLoading ? (
        <RateupLoader />
      ) : filteredLoyaltyActions?.length ? (
        <SimpleGrid cols={3}>
          {filteredLoyaltyActions?.map((action) => (
            <LoyaltyActionCard action={action} key={action?.id} />
          ))}
        </SimpleGrid>
      ) : (
        <NothingFound text={"No actions found"} />
      )}

      <CreateNewLoyaltyAction opened={opened} close={close} />
    </Stack>
  );
};

export default index;
