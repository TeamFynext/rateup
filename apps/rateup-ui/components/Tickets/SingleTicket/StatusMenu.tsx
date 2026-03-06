import { Button, Menu } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";

import { TicketStatus } from "../../../utils/enums/ticket";

export function StatusMenu({ status, setStatus }) {
  return (
    <Menu shadow="md" width={120}>
      <Menu.Target>
        <Button
          variant="outline"
          color={
            status === TicketStatus.OPEN
              ? "blue"
              : status === TicketStatus.IN_PROGRESS
                ? "yellow"
                : status === TicketStatus.RESOLVED
                  ? "orange"
                  : status === TicketStatus.CLOSED
                    ? "green"
                    : "black"
          }
          radius="xl"
          rightSection={<IconChevronDown size="1rem" />}
          tt={"capitalize"}
        >
          {status || "Status"}
        </Button>
      </Menu.Target>

      <Menu.Dropdown
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Menu.Item color={"blue"} onClick={() => setStatus(TicketStatus.OPEN)}>
          {TicketStatus.OPEN}
        </Menu.Item>

        <Menu.Item
          color={"yellow"}
          onClick={() => setStatus(TicketStatus.IN_PROGRESS)}
        >
          {TicketStatus.IN_PROGRESS}
        </Menu.Item>

        <Menu.Item
          color={"orange"}
          onClick={() => setStatus(TicketStatus.RESOLVED)}
        >
          {TicketStatus.RESOLVED}
        </Menu.Item>

        <Menu.Item
          color={"green"}
          onClick={() => setStatus(TicketStatus.CLOSED)}
        >
          {TicketStatus.CLOSED}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
