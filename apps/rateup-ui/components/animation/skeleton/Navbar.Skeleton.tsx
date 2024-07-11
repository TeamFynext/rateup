import React from "react";
import { Box, Card, Divider, Group, Skeleton, Stack } from "@mantine/core";

const NavbarSkeleton = () => {
  return (
    <Card w={250} withBorder px={0}>
      <Stack justify="space-between" h={"100%"}>
        <Box>
          <Group px={"sm"}>
            <Skeleton h={37} w={44} />
            <Skeleton h={20} w={"50%"} />
            <Skeleton h={20} w={20} />
          </Group>
          <Divider mt={17} />
          <Stack p={24} mt={"lg"} gap={"lg"}>
            {Array.from({ length: 11 }).map((_, i) => (
              <Group key={i}>
                <Skeleton h={20} w={20} />
                <Skeleton h={20} w={"60%"} />
                {[1, 2, 3, 10].includes(i) && <Skeleton h={20} w={20} />}
              </Group>
            ))}
          </Stack>
        </Box>
        <Box>
          <Divider />
          <Group justify="space-between" px={"lg"} my={17} align="end">
            <Skeleton circle height={36} width={36} />
            <Group w={"50%"} gap={8}>
              <Skeleton height={20} width="80%" />
              <Skeleton height={16} width="60%" />
            </Group>
            <Skeleton height={26} width={26} />
          </Group>
        </Box>
      </Stack>
    </Card>
  );
};

export default NavbarSkeleton;
