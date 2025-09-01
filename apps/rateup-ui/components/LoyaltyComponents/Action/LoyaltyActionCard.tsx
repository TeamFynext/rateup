"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Badge, Box, Group, Stack, Text, Title } from "@mantine/core";
import { IconClock, IconStarFilled } from "@tabler/icons-react";

import { LoyaltyActionType } from "@/types/enums";
import { ActiveStatusBadge } from "@/app/dashboard/apps&services/shopify/page";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { CardMenu } from "@/components/whatsapp/automation/AutomationCards";
import { formatIsoDateString } from "@/utils/dateTime";

import classes from "../Loyalty.module.css";
import { getActionColor, LoyaltyReward } from "../utils";
import LoyaltyActionMenu from "./LoyaltyActionMenu";

const LoyaltyActionCard = ({ action }) => {
  const router = useRouter();
  return (
    <PaperLayout
      onClick={() => {
        router.push(`/dashboard/loyalty/actions/${action.id}`);
      }}
      style={{
        cursor: "pointer",
      }}
    >
      <Stack gap={"md"}>
        <Group justify="space-between">
          <Title order={3}>{action?.name}</Title>
          <CardMenu>
            <LoyaltyActionMenu action={action} />
          </CardMenu>
        </Group>
        {action?.rewardId ? (
          <LoyaltyReward rewardName={action?.reward?.name} />
        ) : (
          <LoyaltyPoint points={action?.points} />
        )}
        <ValidFromTo from={action?.startDate} to={action?.endDate} />
        <Group justify="space-between">
          <Badge variant={"light"} color={getActionColor(action?.type)}>
            {action?.type}
          </Badge>
          <ActiveStatusBadge active={action?.active} />
        </Group>
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
