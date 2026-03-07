import React from "react";

import { Flex, Group, Skeleton, Stack } from "@mantine/core";

import PaperLayout from "../../../styled/Layouts/PaperLayout";
import SkeletonList from "../SkeletonList";

const TemplatesCardSkeleton = () => (
  <PaperLayout hoveractive={false}>
    <Stack>
      <Flex justify={"space-between"} align={"center"}>
        <Skeleton height={28} width="70%" />
        <Skeleton height={28} circle />
      </Flex>
      <Group>
        <Skeleton height={24} circle />
        <Skeleton height={24} width="50%" />
      </Group>
      <Group>
        <Skeleton height={21} width="25%" />
        <Skeleton height={21} width="25%" />
      </Group>
    </Stack>
  </PaperLayout>
);

export const TemplatesCardListSkeleton = () => {
  return (
    <SkeletonList>
      <TemplatesCardSkeleton />
    </SkeletonList>
  );
};
