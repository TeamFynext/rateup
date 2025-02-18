import React, { useEffect, useRef } from "react";

import {
  ActionIcon,
  CloseIcon,
  Group,
  Stack,
  Text,
  Transition,
} from "@mantine/core";
import { useForm } from "@mantine/form";

import { useCreateCommentMutation } from "@/backend/tickets/tickets.query";
import { TicketInternalChat } from "@/components/Tickets/SingleTicket";
import { useUser } from "@/context/UserContext";
import useContactStore from "@/pages/dashboard/whatsapp/inbox/store";
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
        <div style={{ flex: 1, ...styles }}>
          <Stack justify="space-between" h={"100%"} gap={0}>
            {selectedTicket ? (
              <TicketInternalChat
                user={user}
                form={form}
                waInboxFlag
                close={close}
                ticket={selectedTicket}
                ticketLoading={false}
                onSubmit={onSubmit}
                viewport={viewport}
              />
            ) : (
              <Stack p={"md"}>
                <Group justify="space-between">
                  <Text>No data</Text>
                  <ActionIcon mt={-10} variant="light">
                    <CloseIcon onClick={close} />
                  </ActionIcon>
                </Group>
              </Stack>
            )}
          </Stack>
        </div>
      )}
    </Transition>
  );
};

export default WaInboxChatDisplayPopoverMsg;
