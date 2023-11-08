import { Flex, Stack, Text } from "@mantine/core";
import { ItemDisplay } from "../item/ItemDisplay";

export function CategoryDisplay({ category, setSelectedItem }) {
  return (
    <Stack id={category?.id} p={"lg"}>
      <Text c="var(--shade-of-brown)" fz="1.5rem" fw={700} tt={"capitalize"}>
        {category?.name}
      </Text>
      <Flex wrap="wrap" rowGap={"md"}>
        {category?.items?.map((i: MenuItem) => (
          <ItemDisplay setSelectedItem={setSelectedItem} item={i} key={i.id} />
        ))}
      </Flex>
    </Stack>
  );
}
