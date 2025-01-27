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
    default:
      color = "blue";
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
          <Text style={{ maxWidth: "70%" }} truncate="end" size="xl" fw={500}>
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
          <Title order={5} c="gray.5">
            {translations["TICKET: #"]} {ticket.number}
          </Title>
          <Badge variant="outline" color={color}>
            {ticket?.type}
          </Badge>
        </Group>
        <Group gap="xs" justify="space-between">
          <Group>
            <Avatar radius={"xl"} />
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
            <Text c="gray.3"> {translations["Priority Level : "]}</Text>
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
