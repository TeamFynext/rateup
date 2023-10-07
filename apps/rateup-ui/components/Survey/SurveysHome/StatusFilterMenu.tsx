import { IconChevronDown } from "@tabler/icons-react";
import { Menu, Button } from "@mantine/core";

export function StatusFilterMenu({ filterParam, setFilterParam }) {
  return (
    <Menu shadow="md" width={120}>
      <Menu.Target>
        <Button
          variant="outline"
          color="rgba(13, 13, 13, 1)"
          radius="xl"
          rightSection={<IconChevronDown size="1rem" />}
        >
          Status
        </Button>
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
          color={filterParam === "active" && "blue"}
          onClick={() => setFilterParam("active")}
        >
          Active
        </Menu.Item>

        <Menu.Item
          color={filterParam === "paused" && "blue"}
          onClick={() => setFilterParam("paused")}
        >
          Paused
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
