"use client";
"use no memo";

import React from "react";

import {
  ActionIcon,
  Box,
  Checkbox,
  Flex,
  Group,
  Popover,
  rem,
  ScrollArea,
  Tooltip,
} from "@mantine/core";
import { IconChevronDown, IconDownload, IconFilter } from "@tabler/icons-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import { useResponseFilterStore } from "@/components/Survey/Response/store";
import { Button } from "@/components/ui/button";
// Add shadcn UI imports
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { extractText } from "../../../utils";
import { RateupButtonPrimary } from "../../Button/RateupButtons";

const FilterToggles = ({
  table,
  enableFilter,
  setFilterVisibility,
  filterVisibility,
  enableColumnSelection,
  tempVisibleColumnArray,
  enableExport = false,
  onExport,
}) => {
  const translations = useExtracted();
  const { setServerFilters } = useResponseFilterStore();

  const leafColumns = table
    .getAllLeafColumns()
    ?.filter(
      (column) =>
        column.getIsVisible() && !["select", "action"].includes(column.id),
    )
    ?.map((col) => col.id);

  const handleExport = (type: string) => {
    if (!leafColumns?.length) {
      toast.error(translations("Please select at least one field to export."));
      return;
    }
    onExport.mutate({
      type,
      fields: leafColumns,
    });
  };
  return (
    <Group>
      {enableExport && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <IconDownload
                style={{ width: rem(16), height: rem(16), marginRight: rem(8) }}
              />
              Export
              <IconChevronDown
                style={{ width: rem(14), height: rem(14), marginLeft: rem(4) }}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport("csv")}>
              Download as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("xlsx")}>
              Download as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
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
        <Tooltip label={translations("Clear the filtered values")}>
          <Box>
            <RateupButtonPrimary
              onClick={() => {
                table.resetColumnFilters();
                setServerFilters(null);
              }}
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
