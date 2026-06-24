import { Card, Group, Skeleton } from "@mantine/core";

export const SelectSkeleton = () => {
  return (
    <Card h={46} w={240} radius={"md"} withBorder p={0}>
      <Group justify="space-between" w={"100%"} my={"auto"}>
        <Skeleton w={100} h={20} ml={"xs"} />
        <Skeleton w={20} h={20} mr={"xs"} />
      </Group>
    </Card>
  );
};
