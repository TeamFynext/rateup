"use client";

import React, { useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Avatar,
  Box,
  CloseIcon,
  Collapse,
  Group,
  Popover,
  Radio,
  Stack,
  Text,
  TextInput,
  Title,
  Transition,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronUp,
  IconCircleXFilled,
  IconTicket,
} from "@tabler/icons-react";

import useContactStore from "@/app/dashboard/inbox/store";
import {
  useCreateCommentMutation,
  useUpdateTicketMutation,
  useUpdateTicketStatusMutation,
} from "@/backend/tickets/tickets.query";
import { useUser } from "@/context/UserContext";
import { TicketPriority, TicketStatus } from "@/utils/enums/ticket";
import { showErrorToast } from "@/utils/notifications";

const WaInboxChatDisplayPopoverMsg = () => {
  const { opened, close, selectedTicket, setSelectedTicket } =
    useContactStore();
  const { user } = useUser();
  const viewport = useRef<HTMLDivElement>(null);
  const createComment = useCreateCommentMutation(selectedTicket?.id);

  const form = useForm({
    initialValues: {
      ticketId: selectedTicket?.id,
      createdBy: user.userId,
      msg: "",
    },
    validate: {
      msg: (value) => (value.length ? null : " * Cannot be empty"),
    },
  });

  useEffect(() => {
    if (selectedTicket?.id) form.setFieldValue("ticketId", selectedTicket.id);
    if (user?.userId) form.setFieldValue("createdBy", user?.userId);
  }, [selectedTicket?.id, user?.userId]);

  useEffect(() => {
    if (selectedTicket) scrollToBottom();
  }, [selectedTicket]);

  const scrollToBottom = () =>
    viewport?.current?.scrollTo({
      top: viewport?.current?.scrollHeight,
      behavior: "smooth",
    });
  const onSubmit = () => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }

    createComment.mutate(form.values, {
      onSettled: (e) => {
        setSelectedTicket({
          ...selectedTicket,
          comments: [...selectedTicket.comments, e],
        });
        form.reset();
      },
      onError: (error) => {
        showErrorToast(error?.response?.data?.message);
      },
    });
  };

  return (
    <Transition
      mounted={opened}
      transition="fade"
      duration={400}
      timingFunction="ease"
    >
      {(styles) => (
        <div style={{ ...styles }}>
          <Stack justify="space-between" h={"100%"} gap={0}>
            <TicketInternalChatWaHeader close={close} />
            {/* <TicketInternalChatBody
              user={user}
              waInboxFlag
              ticket={selectedTicket}
              viewport={viewport}
            />
            <TicketInternalChatFooter form={form} onSubmit={onSubmit} /> */}
          </Stack>
        </div>
      )}
    </Transition>
  );
};

export default WaInboxChatDisplayPopoverMsg;

const TicketInternalChatWaHeader = ({ close }) => {
  const {
    user: { orgName, orgLogo, role },
  } = useUser();
  const { setSelectedTicket, selectedTicket } = useContactStore();
  const updateTicket = useUpdateTicketMutation(selectedTicket?.id);
  const updateTicketStatus = useUpdateTicketStatusMutation(selectedTicket?.id);

  const TicketPropUpdate = () => {
    const [openedPriority, { toggle: togglePriority }] = useDisclosure(false);
    const [openedStatus, { toggle: toggleStatus }] = useDisclosure(false);

    const handlePriority = (value) => {
      if (value && value !== selectedTicket?.priority) {
        updateTicket.mutate(
          { priority: value },
          {
            onSuccess: () => {
              setSelectedTicket({ ...selectedTicket, priority: value });
            },
          },
        );
      }
    };

    const handleStatus = (value) => {
      if (value && value !== selectedTicket?.status) {
        updateTicketStatus.mutate(
          { status: value, role },
          {
            onSuccess: () => {
              setSelectedTicket({ ...selectedTicket, status: value });
            },
          },
        );
      }
    };

    return (
      <Popover>
        <Popover.Target>
          <TextInput
            placeholder={"select"}
            w={100}
            size="xs"
            readOnly
            rightSection={<IconTicket color="var(--tertiary-color)" />}
          />
        </Popover.Target>
        <Popover.Dropdown w={150}>
          <Stack gap={2}>
            <Box>
              <Group justify="space-between" mb={5}>
                <Text size="sm" fw={400}>
                  Priority
                </Text>
                <ActionIcon
                  variant="subtle"
                  onClick={togglePriority}
                  size={"sm"}
                >
                  {openedPriority ? <IconChevronUp /> : <IconChevronDown />}
                </ActionIcon>
              </Group>
              <Collapse in={openedPriority}>
                <Radio.Group
                  value={selectedTicket?.priority}
                  onChange={handlePriority}
                  size="xs"
                >
                  <Stack>
                    {Object.values(TicketPriority).map((pr) => (
                      <Radio size="xs" value={pr} label={pr} key={pr} />
                    ))}
                  </Stack>
                </Radio.Group>
              </Collapse>
            </Box>
            <Box>
              <Group justify="space-between" mb={5}>
                <Text fw={400} size="sm">
                  Status
                </Text>
                <ActionIcon variant="subtle" onClick={toggleStatus} size={"sm"}>
                  {openedStatus ? <IconChevronUp /> : <IconChevronDown />}
                </ActionIcon>
              </Group>
              <Collapse in={openedStatus}>
                <Radio.Group
                  value={selectedTicket?.status}
                  onChange={handleStatus}
                  size="xs"
                >
                  <Stack>
                    {Object.values(TicketStatus).map((status) => (
                      <Radio
                        size="xs"
                        value={status}
                        label={status}
                        key={status}
                      />
                    ))}
                  </Stack>
                </Radio.Group>
              </Collapse>
            </Box>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    );
  };
  return (
    <Group
      justify="space-between"
      p={"sm"}
      style={{ borderLeft: "1px solid var(--gift-grey-2)" }}
    >
      <Group gap="xs">
        <Avatar src={orgLogo} size={"sm"} />
        <Stack gap={0}>
          <Text fw={500} truncate={"end"} w={110}>
            {orgName}
          </Text>
          <Text size="sm">Internal Chat</Text>
        </Stack>
      </Group>
      <Group gap={"xs"}>
        <TicketPropUpdate />
        <ActionIcon
          variant="subtle"
          onClick={() => {
            setSelectedTicket(null);
            close();
          }}
          pos={"relative"}
          bottom={20}
        >
          <IconCircleXFilled />
        </ActionIcon>
      </Group>
    </Group>
  );
};
