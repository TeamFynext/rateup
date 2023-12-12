import { Flex, Stack, Text } from "@mantine/core";
import { ItemDisplay } from "../item/ItemDisplay";
import { lexend300, lexend500 } from "../../../utils/fonts";

export function CategoryDisplay({ category, setSelectedItem }) {
  return (
    <Stack id={category?.id} ff={lexend300.style.fontFamily} pb={"lg"}>
      <Text
        c="var(--grey-color)"
        fz="clamp(20px, 11.424px + 1.429vw, 32px)"
        tt={"capitalize"}
        fw={500}
        className={lexend500.className}
      >
        {category?.name}
      </Text>
      <Flex wrap="wrap" rowGap={"sm"}>
        {category?.items?.length === 0 ? (
          <Text ml={"sm"} size="sm" pb={"lg"} fw={500}>
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
