import React, { useState } from "react";

import {
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  Popover,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconCirclePlus } from "@tabler/icons-react";
import { Column } from "@tanstack/react-table";

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: {
    label: string;
    value: string;
    // icon?: React.ComponentType<{ size?: number }>;
    icon?: any;
  }[];
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState("");
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as string[]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()),
  );

  const handleToggleOption = (value: string) => {
    const newSelectedValues = new Set(selectedValues);
    if (newSelectedValues.has(value)) {
      newSelectedValues.delete(value);
    } else {
      newSelectedValues.add(value);
    }
    const filterValues = Array.from(newSelectedValues);
    column?.setFilterValue(filterValues.length ? filterValues : undefined);
  };

  const handleClearFilters = () => {
    column?.setFilterValue(undefined);
    setOpened(false);
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      width={200}
    >
      <Popover.Target>
        <Button
          variant="outline"
          size="xs"
          leftSection={<IconCirclePlus size={16} />}
          onClick={() => setOpened(!opened)}
          styles={{
            root: {
              border: "1px dashed var(--mantine-color-gray-4)",
              height: 32,
            },
          }}
        >
          <Group gap="xs">
            <Text size="sm">{title}</Text>
            {selectedValues.size > 0 && (
              <>
                <Divider orientation="vertical" />
                <Badge size="sm" variant="light" visibleFrom="lg">
                  {selectedValues.size > 2
                    ? `${selectedValues.size} selected`
                    : options
                        .filter((option) => selectedValues.has(option.value))
                        .map((option) => option.label)
                        .join(", ")}
                </Badge>
                <Badge size="sm" variant="light" hiddenFrom="lg">
                  {selectedValues.size}
                </Badge>
              </>
            )}
          </Group>
        </Button>
      </Popover.Target>

      <Popover.Dropdown p={0}>
        <Stack gap={0}>
          <TextInput
            placeholder={title}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="sm"
            m="xs"
          />

          <ScrollArea.Autosize mah={300}>
            {filteredOptions.length === 0 ? (
              <Text c="dimmed" ta="center" p="md" size="sm">
                No results found
              </Text>
            ) : (
              <Stack gap={0}>
                {filteredOptions.map((option) => {
                  const isSelected = selectedValues.has(option.value);
                  const Icon = option.icon;

                  return (
                    <Group
                      key={option.value}
                      gap="xs"
                      p="xs"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleToggleOption(option.value)}
                      justify="space-between"
                      wrap="nowrap"
                    >
                      <Group gap="xs" flex={1}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => {}}
                          size="sm"
                        />
                        {Icon && <Icon size={16} />}
                        <Text size="sm">{option.label}</Text>
                      </Group>
                      {facets?.get(option.value) && (
                        <Text size="xs" c="dimmed" ff="monospace">
                          {facets.get(option.value)}
                        </Text>
                      )}
                    </Group>
                  );
                })}
              </Stack>
            )}
          </ScrollArea.Autosize>

          {selectedValues.size > 0 && (
            <>
              <Divider />
              <Button
                variant="subtle"
                size="sm"
                onClick={handleClearFilters}
                m="xs"
              >
                Clear filters
              </Button>
            </>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
