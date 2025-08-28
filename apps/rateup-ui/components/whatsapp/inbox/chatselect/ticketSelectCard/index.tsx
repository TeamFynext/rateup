"use client";

import React from "react";

import { Card, Group, Text } from "@mantine/core";

// import { PriorityBadge, StatusBadge } from "@/components/Tickets/TicketCard";
import useContactStore from "@/app/dashboard/whatsapp/inbox/store";
import { ITicket } from "@/backend/tickets/tickets";

import styles from "./styles.module.css";

const MessageList = ({ ticket }: { ticket: ITicket }) => {
  const { setTicketAndOpen, selectedTicket } = useContactStore();

  return (
    <Card
      key={ticket.id}
      py="xs"
      px="md"
      onClick={() => {
        setTicketAndOpen(ticket);
      }}
      className={styles["hovered-and-hover-active"]}
      bg={
        ticket?.id === selectedTicket?.id
          ? "var(--mantine-color-gray-1)"
          : undefined
      }
    >
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          {ticket.title}
        </Text>
        {/* <PriorityBadge priority={ticket.priority} /> */}
      </Group>
      <Text size="xs" c="dimmed">
        Assigned: {ticket.assignedTo?.name} •{" "}
        {new Date(ticket.createdAt).toDateString()}
      </Text>
      <Group justify="space-between" mt={4}>
        {/* <StatusBadge status={ticket.status} /> */}
        <Text size="xs" c="red">
          Deadline: {ticket.deadline ?? "None"}
        </Text>
      </Group>
    </Card>
  );
};

export default MessageList;
