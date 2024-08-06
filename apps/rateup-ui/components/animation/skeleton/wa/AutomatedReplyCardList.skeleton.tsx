import React from "react";

import { Flex, Group, Skeleton, Stack } from "@mantine/core";

import PaperLayout from "@/components/styled/Layouts/PaperLayout";

import SkeletonList from "../SkeletonList";

const AutomatedReply = () => (
  <PaperLayout hoveractive={false} onClick={() => {}}>
    <Stack>
      <Flex justify={"space-between"} align={"center"}>
        <Skeleton height={28} width="70%" />
        <Skeleton height={28} circle />
      </Flex>

      <Group mt={"xl"}>
        <Skeleton height={24} circle />
        <Skeleton height={24} width="50%" />
      </Group>
      <Group>
        <Skeleton height={20} width="15%" />
        <Skeleton height={20} width="15%" />
      </Group>
    </Stack>
  </PaperLayout>
);

export const AutomatedReplyCardListSkeleton = () => {
  return (
    <SkeletonList>
      <AutomatedReply />
    </SkeletonList>
  );
};
