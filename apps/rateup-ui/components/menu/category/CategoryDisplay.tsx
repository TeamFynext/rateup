import { Flex, Stack, Text } from "@mantine/core";
import { ItemDisplay } from "../item/ItemDisplay";
import { formatedTime } from "../../../utils/dateTime";

export function CategoryDisplay({
  category,
  setSelectedItem,
  currency,
  hideUnavailableCategory,
}) {
  const {
    categoryDisabled,
    formattedStartTimeWithAmPm,
    formattedEndTimeWithAmPm,
  } = formatedTime(category);
  return (
    <Stack id={category?.id} fw={300} pb={"lg"}>
      <Stack gap={0}>
        <Text
          c="var(--grey-color)"
          fz="clamp(20px, 11.424px + 1.429vw, 32px)"
          tt={"capitalize"}
          fw={500}
        >
          {category?.name}
        </Text>
        {categoryDisabled && !hideUnavailableCategory && (
          <Text size="xs" ml={"xs"} c={"var(--grey-color-2)"}>
            {`This category is exclusively accessible between ${formattedStartTimeWithAmPm} and ${formattedEndTimeWithAmPm}`}
          </Text>
        )}
      </Stack>
      <Flex wrap="wrap" rowGap={"sm"}>
        {category?.items?.length === 0 ||
        (categoryDisabled && hideUnavailableCategory) ? (
          <Text ml={"sm"} size="sm" pb={"lg"} fw={500}>
            No Data Found
          </Text>
        ) : (
          category?.items?.map((i: MenuItem) => (
            <ItemDisplay
              setSelectedItem={setSelectedItem}
              item={i}
              key={i?.id}
              currency={currency}
              categoryDisabled={categoryDisabled}
            />
          ))
        )}
      </Flex>
    </Stack>
  );
}
