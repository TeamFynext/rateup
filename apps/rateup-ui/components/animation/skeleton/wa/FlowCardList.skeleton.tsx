import React from "react";

import { Flex, Group, Skeleton, Stack } from "@mantine/core";

import PaperLayout from "../../../styled/Layouts/PaperLayout";
import SkeletonList from "../SkeletonList";

const FlowCardSkeleton = () => (
  <PaperLayout hoveractive={false} onClick={() => {}}>
    <Stack>
      <Flex justify={"space-between"} align={"center"}>
        <Skeleton height={28} width="70%" />
        <Skeleton height={28} circle />
      </Flex>
      <Group>
        <Skeleton height={24} circle />
        <Skeleton height={24} width="50%" />
      </Group>
      <Skeleton height={20} width="25%" />
    </Stack>
  </PaperLayout>
);

export const FlowCardListSkeleton = () => {
  return (
    <SkeletonList>
      <FlowCardSkeleton />
    </SkeletonList>
  );
};
