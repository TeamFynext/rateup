import React from "react";
import {
  ActionIcon,
  rem,
  Popover,
  ScrollArea,
  Flex,
  Checkbox,
  Box,
  Tooltip,
  Group,
} from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import { extractText } from "../../../utils";

const FilterToggles = ({
  table,
  enableFilter,
  setFilterVisibility,
  filterVisibility,
  enableColumnSelection,
  tempVisibleColumnArray,
}) => {
  return (
    <Group>
      {enableFilter && (
        <ActionIcon
          onClick={() => setFilterVisibility((el) => !el)}
          variant={filterVisibility ? "filled" : "outline"}
        >
          <IconFilter
            style={{ width: rem(16), height: rem(16) }}
            stroke={1.5}
          />
        </ActionIcon>
      )}
      {enableColumnSelection && (
        <Popover width={200} position="bottom" withArrow shadow="md" offset={2}>
          <Popover.Target>
            <Box>
              <RateupButtonPrimary title="Select Fields" variant="outline" />
            </Box>
          </Popover.Target>
          <Popover.Dropdown>
            <ScrollArea.Autosize mah={"200px"}>
              <Flex align={"center"}>
                <Checkbox
                  {...{
                    type: "checkbox",
                    checked: table.getIsAllColumnsVisible(),
                    onChange: table.getToggleAllColumnsVisibilityHandler(),
                  }}
                  label={"Toggle All"}
                />
              </Flex>
              {table.getAllLeafColumns().map((column, index) => {
                if (column.getIsVisible())
                  tempVisibleColumnArray.push(column?.id?.split("_,_")?.[0]);
                return (
                  <Flex key={index} mt={4} align={"center"}>
                    <Checkbox
                      {...{
                        checked: column.getIsVisible(),
                        onChange: column.getToggleVisibilityHandler(),
                      }}
                      label={extractText(column?.id?.split("_,_")?.[0])}
                    />
                  </Flex>
                );
              })}
            </ScrollArea.Autosize>
          </Popover.Dropdown>
        </Popover>
      )}
      {enableFilter && (
        <Tooltip label="Clear the filtered values">
          <Box>
            <RateupButtonPrimary
              onClick={() => table.resetColumnFilters()}
              title="Reset"
              variant="outline"
            />
          </Box>
        </Tooltip>
      )}
    </Group>
  );
};

export default FilterToggles;
