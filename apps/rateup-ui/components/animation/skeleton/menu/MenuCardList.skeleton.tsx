import React from "react";

import { Box, Flex, Group, Skeleton, Stack } from "@mantine/core";

import PaperLayout from "../../../styled/Layouts/PaperLayout";
import SkeletonList from "../SkeletonList";

const MenuCardSkeleton = () => (
  <PaperLayout hoveractive={false}>
    <Stack>
      <Box>
        <Flex justify="space-between" align="center">
          <Skeleton height={22} width="70%" />
          <Skeleton height={22} width="10%" />
        </Flex>
        <Skeleton height={20} width="90%" mt="xs" />
      </Box>

      <Skeleton height={20} width="50%" />

      <Group>
        <Skeleton height={24} width="20%" radius={"xl"} />
        <Skeleton height={24} width="20%" radius={"xl"} />
      </Group>
    </Stack>
  </PaperLayout>
);

export const MenuCardListSkeleton = () => {
  return (
    <SkeletonList>
      <MenuCardSkeleton />
    </SkeletonList>
  );
};
