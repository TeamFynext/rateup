import { Dispatch, SetStateAction } from "react";

import { Box, Button, Popover, Stack, Text, Title } from "@mantine/core";
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
      trapFocus
    >
      <Popover.Target>
        <Button
          onClick={() => setFilterOpened((o) => !o)}
          variant="default"
          color="gray"
          radius="sm"
          size="sm"
          px="sm"
          ml={"auto"}
          leftSection={<IconFilter size={19} />}
        >
          {priorityFilter || "Filter"}
        </Button>
      </Popover.Target>

      <Popover.Dropdown>
        <Box>
          <Title order={6} mb="xs" c="dimmed">
            Filter by Priority
          </Title>

          <Stack gap={4}>
            {priorities.map((item) => {
              const selected = priorityFilter === item.value;
              return (
                <Text
                  key={item.value}
                  onClick={() => {
                    setPriorityFilter(item.value || null);
                    setFilterOpened(false);
                  }}
                  style={{
                    cursor: "pointer",
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontWeight: selected ? 600 : 400,
                    backgroundColor: selected
                      ? "var(--mantine-color-blue-light)"
                      : "transparent",
                    color: selected ? "#1c7ed6" : "inherit",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      (e.target as HTMLElement).style.backgroundColor =
                        "#eafaf1";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      (e.target as HTMLElement).style.backgroundColor =
                        "transparent";
                    }
                  }}
                >
                  {item.label}
                </Text>
              );
            })}
          </Stack>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
