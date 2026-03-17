"use client";

import { Flex, Stack, Text } from "@mantine/core";
import { useExtracted } from "next-intl";

import { formatedTime } from "../../../utils/dateTime";
import { ItemDisplay } from "../item/ItemDisplay";

export function CategoryDisplay({
  category,
  setSelectedItem,
  currency,
  hideUnavailableCategory,
  categoryRefs,
}) {
  const {
    categoryDisabled,
    formattedStartTimeWithAmPm,
    formattedEndTimeWithAmPm,
  } = formatedTime(category);
  const translations = useExtracted();
  return (
    <Stack
      ref={(el) => {
        categoryRefs.current[category.id] = el;
      }}
      fw={300}
      pb={"lg"}
    >
      <Stack gap={0}>
        <Text
          c="var(--text-color-sp)"
          fz="clamp(20px, 11.424px + 1.429vw, 32px)"
          tt={"capitalize"}
          fw={500}
        >
          {category?.name}
        </Text>
        {categoryDisabled && !hideUnavailableCategory && (
          <Text size="xs" ml={"xs"} c={"var(--grey-color-2)"}>
            {`${translations("This category is exclusively accessible between")} ${formattedStartTimeWithAmPm} and ${formattedEndTimeWithAmPm}`}
          </Text>
        )}
      </Stack>
      <Flex wrap="wrap" rowGap={"sm"}>
        {category?.items?.length === 0 ||
        (categoryDisabled && hideUnavailableCategory) ? (
          <Text ml={"sm"} size="sm" pb={"lg"} fw={500}>
            {translations("No Data Found")}
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
