import {
  Stack,
  Group,
  Avatar,
  Badge,
  Text,
  Title,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import { useState, useEffect } from "react";

import router from "next/router";
import { getTimeSince } from "../../utils";
import { ITicket } from "../../backend/tickets/tickets";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { TicketStatus, TicketType } from "../../utils/enums/ticket";
import { IconTrash } from "@tabler/icons-react";

interface TicketCardProps {
  ticket: ITicket;
  setDeleteTicketId: (id: string) => void;
}

/**
 * The TicketCard component used to display a ticket in the tickets page
 */
export function TicketCard({
  ticket,
  setDeleteTicketId,
}: TicketCardProps): JSX.Element {
  const [timeSince, setTimeSince] = useState("");
  useEffect(() => {
    if (ticket?.createdAt) {
      setTimeSince(getTimeSince(new Date(ticket?.createdAt).toString()));
      const timeoutID = setInterval(
        () =>
          setTimeSince(getTimeSince(new Date(ticket?.createdAt).toString())),
        5000,
      );
      return () => clearInterval(timeoutID);
    }
  }, []);

  return (
    <PaperLayout
      hoveractive
      mah={200}
      mih={200}
      p="md"
      shadow="lg"
      radius="lg"
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        router.push(`${router.pathname}/${ticket?.id}`);
      }}
    >
      <Stack justify="space-between" h={"100%"}>
        <Group justify={"space-between"} align={"center"}>
          <Text style={{ maxWidth: "70%" }} truncate="end" size="xl" fw={700}>
            {ticket?.title}
          </Text>
          <Tooltip label="Remove this survey from group">
            <ActionIcon
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTicketId(ticket?.id);
              }}
              variant="light"
              color="red"
              aria-label="Settings"
            >
              <IconTrash style={{ width: "70%", height: "70%" }} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Group justify="space-between">
          <Title order={5} c="gray.5">
            TICKET: #{ticket.number}
          </Title>
          <Badge
            variant="outline"
            color={ticket?.type !== TicketType.REVIEW ? "blue" : "#149a8a"}
          >
            {ticket?.type}
          </Badge>
        </Group>
        <Group gap="xs">
          <Avatar radius={"xl"} />
          <Text size="sm" c="dimmed">
            Created {timeSince}
          </Text>
        </Group>
        <Group justify="space-between">
          <Group>
            <Text c="gray.3"> Priority Level : </Text>
            <PriorityBadge priority={ticket?.priority} />
          </Group>
          <Group justify={"space-between"} align={"center"}>
            <StatusBadge status={ticket?.status} />
          </Group>
        </Group>
      </Stack>
    </PaperLayout>
  );
}

function PriorityBadge({ priority }) {
  return (
    // swtich case for 4 priority levels
    <Badge
      color={
        priority === "LOW"
          ? "blue"
          : priority === "MEDIUM"
            ? "yellow"
            : priority === "HIGH"
              ? "orange"
              : "red"
      }
      variant="light"
    >
      {priority}
    </Badge>
  );
}

function StatusBadge({ status }) {
  return (
    // swtich case for 4 priority levels
    <Badge
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
      variant="filled"
    >
      {status}
    </Badge>
  );
}
