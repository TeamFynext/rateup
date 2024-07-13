import { IconChevronDown } from "@tabler/icons-react";
import { Menu, Button, Tooltip } from "@mantine/core";

export function StatusFilterMenu({ filterParam, setFilterParam }) {
  return (
    <Menu shadow="md" width={120}>
      <Menu.Target>
        <Tooltip label="Filter survey" withArrow position="top">
          <Button
            variant="outline"
            color="#3F5BA9"
            radius="xl"
            rightSection={<IconChevronDown size="1rem" />}
            tt={"capitalize"}
            style={{ minWidth: 110 }}
          >
            {filterParam ?? "Status"}
          </Button>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Menu.Item
          color={filterParam === "all" && "blue"}
          onClick={() => setFilterParam("all")}
        >
          All
        </Menu.Item>

        <Menu.Item
          color={filterParam === "active" && "green"}
          onClick={() => setFilterParam("active")}
        >
          Active
        </Menu.Item>

        <Menu.Item
          color={filterParam === "paused" && "yellow"}
          onClick={() => setFilterParam("paused")}
        >
          Paused
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
