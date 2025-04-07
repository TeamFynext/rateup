import { Dispatch, SetStateAction } from "react";

import { Button, Popover, Stack, Text } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";

interface FilterProps {
  filterOpened: boolean;
  setFilterOpened: Dispatch<SetStateAction<boolean>>;
  priorityFilter: string | null;
  setPriorityFilter: Dispatch<SetStateAction<string | null>>;
}

export function PriorityFilter({
  filterOpened,
  setFilterOpened,
  priorityFilter,
  setPriorityFilter,
}: FilterProps) {
  const priorities = [
    { value: "", label: "Default" },
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "CRITICAL", label: "Critical" },
  ];

  return (
    <Popover
      opened={filterOpened}
      onChange={setFilterOpened}
      position="bottom-end"
      shadow="md"
      withArrow
    >
      <Popover.Target>
        <Button
          onClick={() => setFilterOpened((o) => !o)}
          variant="default"
          color="gray"
          radius="md"
          size="sm"
        >
          <IconFilter size={16} />
          <span style={{ marginLeft: 6 }}>
            {priorityFilter ? priorityFilter : "Filter"}
          </span>
        </Button>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="xs">
          {priorities.map((item) => (
            <Text
              key={item.value}
              onClick={() => {
                setPriorityFilter(item.value || null);
                setFilterOpened(false);
              }}
              style={{
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 4,
                color: priorityFilter === item.value ? "#5c6ac4" : "inherit",
                fontWeight: priorityFilter === item.value ? 600 : 400,
              }}
            >
              {item.label}
            </Text>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
