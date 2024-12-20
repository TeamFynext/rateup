import React from "react";
import { useRouter } from "next/router";

import { Badge, Box, Group, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconClock, IconStarFilled } from "@tabler/icons-react";

import { LoyaltyActionType } from "@/types/enums";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { CardMenu } from "@/components/whatsapp/automation/AutomationCards";
import { formatIsoDateString } from "@/utils/dateTime";

import classes from "./Actions.module.css";
import CreateNewLoyaltyAction from "./CreateNewLoyaltyAction";
import LoyaltyActionMenu from "./LoyaltyActionMenu";

const LoyaltyActionCard = ({ action }) => {
  const router = useRouter();

  const [opened, { open, close }] = useDisclosure(false);

  function getActionColor(type) {
    switch (type) {
      case LoyaltyActionType.ReferralPurchase:
        return "#2942CC";
      case LoyaltyActionType.DirectPurchase:
        return "#CC2960";
    }
  }

  return (
    <PaperLayout
      onClick={open}
      style={{
        cursor: "pointer",
      }}
    >
      <Stack gap={"md"}>
        <Group justify="space-between">
          <Title order={3}>{action?.name}</Title>
          <CardMenu>
            <LoyaltyActionMenu actionId={action?.id} />
          </CardMenu>
        </Group>
        <LoyaltyPoint points={action?.points} />
        <ValidFromTo from={action?.startDate} to={action?.endDate} />
        <Badge variant={"light"} color={getActionColor(action?.type)}>
          {action?.type}
        </Badge>
        <CreateNewLoyaltyAction opened={opened} close={close} action={action} />
      </Stack>
    </PaperLayout>
  );
};

export default LoyaltyActionCard;

export const LoyaltyPoint = ({ points }) => {
  return (
    <Group gap={"xs"}>
      <LoyaltyPointIcon />
      <Text c={"#F9861E"} fw={"bold"} fz={14}>
        {points} Points
      </Text>
    </Group>
  );
};

export const LoyaltyPointIcon = () => {
  return (
    <Box className={classes["point-outer"]}>
      <Box className={classes["point-inner"]}>
        <IconStarFilled size={"1rem"} color="#F9861E" />
      </Box>
    </Box>
  );
};

export const ValidFromTo = ({ from, to }) => {
  return (
    <Group c={"var(--mantine-color-gray-6)"} gap={"xs"}>
      <IconClock size={"1rem"} />
      <Text fz={13}>
        Valid from {formatIsoDateString(from)} - {formatIsoDateString(to)}
      </Text>
    </Group>
  );
};
