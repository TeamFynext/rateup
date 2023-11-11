import { Flex, SimpleGrid, Stack, Text } from "@mantine/core";
import { ItemDisplay } from "../item/ItemDisplay";
import { GilroySemibold } from "../../../public/fonts";

export function CategoryDisplay({ category, setSelectedItem }) {
  return (
    <Stack id={category?.id} className={GilroySemibold.className}>
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
