import React, { useState } from "react";

import { ActionIcon, Divider, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconCalendar,
  IconCircleArrowRightFilled,
  IconHandClick,
} from "@tabler/icons-react";

import { LoyaltyActionType } from "@/types/enums";
import { DateRangePickerModal } from "@/components/reputationManagement/misc/DateRangePicker";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import {
  getLCustomerStatsIcon,
  LCustomerStats,
} from "@/pages/dashboard/loyalty/customer/[customerId]";

const LCustomerActionView = ({ setActiveStats, actions }) => {
  return (
    <Stack p="md">
      {[LCustomerStats.TotalActions, ...Object.values(LoyaltyActionType)].map(
        (a) => (
          <PaperLayout
            bg={"var(--grey-color-5)"}
            p={"xs"}
            onClick={() => setActiveStats(a)}
            style={{ cursor: "pointer" }}
            hoveractive
            key={a}
          >
            <Group justify="space-between">
              <Stack gap={1}>
                <Text fw={500} size="sm">
                  {a}
                </Text>
                <Text fw={800} c={"var(--tertiary-color)"} size="xl">
                  {a === LCustomerStats.TotalActions
                    ? actions?.length
                    : actions?.filter((ac) => ac.action.type === a).length}
                </Text>
              </Stack>
              <IconCircleArrowRightFilled
                color={"var(--tertiary-color)"}
                size="1.5rem"
              />
            </Group>
          </PaperLayout>
        ),
      )}
    </Stack>
  );
};

export default LCustomerActionView;

export const DetailedViewHeader = ({
  activeStats,
  title,
  setActiveStats,
  range,
  setRange,
}) => {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <Stack>
      <Group justify="space-between" px={"lg"}>
        {Object.values(LCustomerStats).includes(activeStats) ? (
          <Group c="var(--tertiary-color)">
            {getLCustomerStatsIcon(activeStats)}
            <Text fw={600} size="md">
              {title}
            </Text>
          </Group>
        ) : (
          <ActionIcon
            color="var(--tertiary-color)"
            onClick={() => setActiveStats(LCustomerStats.TotalActions)}
            radius={"xl"}
          >
            <IconArrowLeft />
          </ActionIcon>
        )}
        <ActionIcon color="var(--tertiary-color)" onClick={open}>
          <IconCalendar />
        </ActionIcon>
      </Group>
      <Divider />
      <DateRangePickerModal
        opened={opened}
        ranges={range}
        close={close}
        onChange={(r) => setRange(r ? [r["selection"]] : [])}
      />
    </Stack>
  );
};
