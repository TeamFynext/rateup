import { Button, Menu } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";

import { TicketPriority } from "../../../utils/enums/ticket";

export function PriorityMenu({ priority, setPriority }) {
  return (
    <Menu shadow="md" width={120}>
      <Menu.Target>
        <Button
          variant="outline"
          color={
            priority === TicketPriority.LOW
              ? "blue"
              : priority === TicketPriority.MEDIUM
                ? "yellow"
                : priority === TicketPriority.HIGH
                  ? "orange"
                  : priority === TicketPriority.CRITICAL
                    ? "red"
                    : "rgba(13, 13, 13, 1)"
          }
          radius="xl"
          rightSection={<IconChevronDown size="1rem" />}
          tt={"capitalize"}
        >
          {priority || "Priority"}
        </Button>
      </Menu.Target>

      <Menu.Dropdown
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Menu.Item
          color={"blue"}
          onClick={() => setPriority(TicketPriority.LOW)}
        >
          {TicketPriority.LOW}
        </Menu.Item>

        <Menu.Item
          color={"yellow"}
          onClick={() => setPriority(TicketPriority.MEDIUM)}
        >
          {TicketPriority.MEDIUM}
        </Menu.Item>

        <Menu.Item
          color={"orange"}
          onClick={() => setPriority(TicketPriority.HIGH)}
        >
          {TicketPriority.HIGH}
        </Menu.Item>

        <Menu.Item
          color={"red"}
          onClick={() => setPriority(TicketPriority.CRITICAL)}
        >
          {TicketPriority.CRITICAL}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
