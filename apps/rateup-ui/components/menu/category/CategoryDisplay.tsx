import { Flex, Stack, Text } from "@mantine/core";
import { ItemDisplay } from "../item/ItemDisplay";

export function CategoryDisplay({ category, setSelectedItem }) {
  return (
    <Stack
      p="lg"
      id={category.id}
    >
      <Text
        color="#AF6B2E"
        fz="1.5rem"
        fw={700}

      >{category.name}</Text>
      <Flex
        wrap="wrap"
        rowGap={"md"}

      >
        {category.items.map((i: MenuItem) => (
          <ItemDisplay setSelectedItem={setSelectedItem} item={i} key={i.id} />
        ))}
      </Flex>
    </Stack>
  );
}
