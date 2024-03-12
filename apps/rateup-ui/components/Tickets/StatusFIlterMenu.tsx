import { IconChevronDown } from "@tabler/icons-react";
import { Menu, Button, Text } from "@mantine/core";
import { TicketStatus } from "../../utils/enums/ticket";

export function StatusFilterMenu({ filterParam, setFilterParam }) {
  return (
    <Menu shadow="md" width={120}>
      <Menu.Target>
        <Button
          variant="light"
          radius="xl"
          size="xs"
          style={{ minWidth: "150px" }}
          rightSection={<IconChevronDown size="1rem" />}
          tt={"capitalize"}
        >
          {filterParam ?? "Status"}
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
          <Text size="xs">All</Text>
        </Menu.Item>

        {Object.keys(TicketStatus).map((status) => (
          <Menu.Item
            color={filterParam === status && "blue"}
            onClick={() => setFilterParam(status)}
          >
            <Text size="xs">{status}</Text>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
