import { Flex, Stack, Text } from "@mantine/core";
import { ItemDisplay } from "../item/ItemDisplay";

export function CategoryDisplay({ category, setSelectedItem }) {
  return (
    <Stack id={category?.id}>
      <Text
        c="var(--grey-color)"
        fz="clamp(1.25rem, 0.714rem + 1.429vw, 2rem)"
        tt={"capitalize"}
      >
        {category?.name}
      </Text>
      <Flex wrap="wrap" rowGap={"sm"}>
        {category?.items?.length === 0 ? (
          <Text ml={"sm"} size="sm" pb={"lg"}>
            No Data Found
          </Text>
        ) : (
          category?.items?.map((i: MenuItem) => (
            <ItemDisplay
              setSelectedItem={setSelectedItem}
              item={i}
              key={i.id}
            />
          ))
        )}
      </Flex>
    </Stack>
  );
}
