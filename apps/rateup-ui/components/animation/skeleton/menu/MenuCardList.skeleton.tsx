import React from "react";
import { Skeleton, Stack, Box, Flex, Group } from "@mantine/core";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import SkeletonList from "../SkeletonList";

const MenuCardSkeleton = () => (
  <PaperLayout hoveractive={false}>
    <Stack>
      <Box>
        <Flex justify="space-between" align="center">
          <Skeleton height={28} width="70%" />
          <Skeleton height={28} width="10%" />
        </Flex>
        <Skeleton height={20} width="90%" mt="xs" />
      </Box>

      <Skeleton height={20} width="50%" />

      <Group>
        <Skeleton height={24} width="30%" radius={"xl"} />
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
