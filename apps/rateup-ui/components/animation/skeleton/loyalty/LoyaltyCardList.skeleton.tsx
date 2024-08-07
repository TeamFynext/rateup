import React from "react";

import { Box, Flex, Group, Skeleton, Stack } from "@mantine/core";

import PaperLayout from "@/components/styled/Layouts/PaperLayout";

import SkeletonList from "../SkeletonList";

const LoyaltyCardSkeleton = () => (
  <PaperLayout hoveractive={false}>
    <Stack>
      <Box>
        <Flex justify="space-between" align="center">
          <Skeleton height={22} width="70%" />
          <Skeleton height={22} width="10%" />
        </Flex>
        <Skeleton height={20} width="40%" mt="md" />
      </Box>

      <Group justify="flex-end">
        <Skeleton height={24} width="40%" radius={"xl"} />
      </Group>
    </Stack>
  </PaperLayout>
);

export const LoyaltyCardListSkeleton = () => {
  return (
    <SkeletonList>
      <LoyaltyCardSkeleton />
    </SkeletonList>
  );
};
