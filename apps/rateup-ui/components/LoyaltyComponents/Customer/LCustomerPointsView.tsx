import React from "react";

import { Group, Stack, Text } from "@mantine/core";
import { IconCircleArrowRightFilled } from "@tabler/icons-react";

import { LoyaltyActionType } from "@/types/enums";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { LCustomerStats } from "@/pages/dashboard/loyalty/customer/[customerId]";

export enum LPointStats {
  TotalPoints = "Total Points Earned",
  PointSpent = "Points Spent",
  PointBalance = "Points Balance",
  PointEaringRate = "Points Earning Rate",
}
const LCustomerPointsView = ({ setActiveStats, stats }) => {
  const isHoverAvailable = (s) =>
    [LPointStats.TotalPoints, LPointStats.PointSpent].includes(s);
  return (
    <Stack p="md">
      {Object.values(LPointStats).map((a) => (
        <PaperLayout
          bg={"var(--grey-color-5)"}
          p={"xs"}
          onClick={isHoverAvailable(a) ? () => setActiveStats(a) : undefined}
          style={{ cursor: isHoverAvailable(a) ? "pointer" : undefined }}
          hoveractive={isHoverAvailable(a)}
          key={a}
        >
          <Group justify="space-between">
            <Stack gap={1}>
              <Text fw={500} size="sm">
                {a}
              </Text>
              <Text fw={800} c={"var(--tertiary-color)"} size="xl">
                {stats[a]}
              </Text>
            </Stack>
            {isHoverAvailable(a) && (
              <IconCircleArrowRightFilled
                color={"var(--tertiary-color)"}
                size="1.5rem"
              />
            )}
          </Group>
        </PaperLayout>
      ))}
    </Stack>
  );
};

export default LCustomerPointsView;
