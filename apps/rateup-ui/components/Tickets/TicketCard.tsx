import { useEffect, useState } from "react";
import router from "next/router";

import {
  ActionIcon,
  Avatar,
  Badge,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import { ITicket } from "../../backend/tickets/tickets";
import { getTimeSince } from "../../utils";
import { TicketStatus, TicketType } from "../../utils/enums/ticket";
import PaperLayout from "../styled/Layouts/PaperLayout";

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
  const { translations } = useTranslations();
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

  let color;
  switch (ticket?.type) {
    case TicketType.REVIEW:
      color = "purple";
      break;
    case TicketType.CUSTOM:
      color = "green";
      break;
    case TicketType.FLOW_RESPONSE:
      color = "var(--wa-green)";
      break;
    case TicketType.AUTOMATION:
      color = "var(--wa-blue)";
      break;
    default:
      color = "var(--tertiary-color)";
      break;
  }

  function calculateDaysLeft(deadlineDate) {
    const today = new Date().getTime();
    const deadline = new Date(deadlineDate).getTime();
    const differenceMs = deadline - today;
    const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));

    if (differenceDays < 0) {
      return `Overdue by ${Math.abs(differenceDays)} days`;
    } else if (differenceDays === 0) {
      return `Today is the deadline`;
    } else {
      return `${differenceDays} ${differenceDays !== 1 ? "days" : "day"} left`;
    }
  }

  return (
    <PaperLayout
      hoveractive
      p="md"
      shadow="lg"
      radius="lg"
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        router.push(`${router.pathname}/${ticket?.id}`);
      }}
    >
      <Stack justify="space-between" h={"100%"} gap={"xs"}>
        <Group justify={"space-between"} align={"center"}>
          <Text style={{ maxWidth: "70%" }} truncate="end" fw={500}>
            {ticket?.title}
          </Text>
          <Tooltip label={translations["Delete ticket"]}>
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
          <Title order={5} c="gray.5" size={"sm"}>
            {translations["TICKET: #"]} {ticket.number}
          </Title>
          <Badge variant="outline" color={color}>
            {ticket?.type}
          </Badge>
        </Group>
        <Group gap="xs" justify="space-between">
          <Group>
            <Avatar radius={"xl"} size={"sm"} />
            <Text size="sm" c="dimmed">
              {translations["Created"]} {timeSince}
            </Text>
          </Group>

          {ticket?.deadline && (
            <Text size="sm" c="red">
              * {calculateDaysLeft(ticket?.deadline)}
            </Text>
          )}
        </Group>
        <Group justify="space-between">
          <Group>
            <Text c="gray.3" size="sm">
              {" "}
              {translations["Priority Level : "]}
            </Text>
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

export function PriorityBadge({ priority }) {
  // swtich case for 4 priority levels
  let color;
  switch (priority) {
    case "LOW":
      color = "blue";
      break;
    case "MEDIUM":
      color = "yellow";
      break;
    case "HIGH":
      color = "orange";
      break;
    default:
      color = "red";
      break;
  }

  return (
    <Badge color={color} variant="light">
      {priority}
    </Badge>
  );
}

export function StatusBadge({ status }) {
  let color;
  switch (status) {
    case TicketStatus.OPEN:
      color = "blue";
      break;
    case TicketStatus.IN_PROGRESS:
      color = "yellow";
      break;
    case TicketStatus.RESOLVED:
      color = "orange";
      break;
    case TicketStatus.CLOSED:
      color = "green";
      break;
    default:
      color = "black";
      break;
  }

  return (
    <Badge color={color} variant="filled">
      {status}
    </Badge>
  );
}
