"use client";

import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Group,
  MultiSelect,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBell } from "@tabler/icons-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { z } from "zod/v4";

import { MemberSelector } from "@/app/dashboard/tickets/[ticketId]/page";
import {
  useBoardTeamMembersById,
  useUpdateBoardMutation,
} from "@/backend/tickets/tickets.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import { Board } from "./types";

// Create Zod schema for form validation with additional title and teamIds fields
const notificationSchema = z.object({
  id: z.string(),
  ticketCreatedEmail: z.boolean().optional(),
  ticketCreatedWhatsapp: z.boolean(),
  ticketAssignedEmail: z.boolean().optional(),
  ticketAssignedWhatsapp: z.boolean().optional(),
  assignedToIds: z.array(z.string().optional()),
  title: z.string().min(1, "Board title is required"),
  teamIds: z.array(z.string()),
});

export type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function TicketSettings({
  boardId,
  selectedBoard,
  teamOptions,
}: {
  boardId: string;
  selectedBoard: Board;
  teamOptions: { value: string; label: string }[];
}) {
  const updateBoardMutation = useUpdateBoardMutation();
  // Fetch users for the MultiSelect
  const { data: members = [], isPending: isMembersLoading } =
    useBoardTeamMembersById(boardId);
  // Initialize form with Mantine useForm and Zod validation
  const form = useForm<NotificationFormValues>({
    initialValues: {
      id: selectedBoard?.id || "",
      ticketCreatedEmail: selectedBoard?.ticketCreatedEmail || false,
      ticketCreatedWhatsapp: selectedBoard?.ticketCreatedWhatsapp || false,
      ticketAssignedEmail: selectedBoard?.ticketAssignedEmail || false,
      ticketAssignedWhatsapp: selectedBoard?.ticketAssignedWhatsapp || false,
      assignedToIds:
        selectedBoard?.notificationRecipients?.map(
          (recipients) => recipients.userId,
        ) || [],
      title: selectedBoard?.title || "",
      teamIds: selectedBoard?.teams?.map((teams) => teams.teamId) || [],
    },
    validate: zod4Resolver(notificationSchema),
  });

  const handleSubmit = form.onSubmit((values) => {
    updateBoardMutation.mutate(values);
  });

  if (isMembersLoading)
    return <RateupLoader aria-label="Loading ticket members" />;

  return (
    <Container size="md">
      <PaperLayout shadow="xs" p="xl" radius="md">
        <Title order={2} mb="sm">
          Board Settings
        </Title>
        <Divider mb="lg" />
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            {/* Board Information */}
            <Box>
              <Title order={4} mb="sm">
                Board Information
              </Title>
              <Text c="dimmed" size="sm" mb="sm">
                Update board title and associated teams
              </Text>

              <SimpleGrid cols={2}>
                <ContainedTextField
                  label="Board Title"
                  placeholder="Enter board title"
                  {...form.getInputProps("title")}
                  required
                  mb="sm"
                />

                <MultiSelect
                  radius="md"
                  label="Teams"
                  placeholder="Select teams"
                  data={teamOptions}
                  {...form.getInputProps("teamIds")}
                />
              </SimpleGrid>
            </Box>

            {/* User Selection */}
            <Box>
              <Title order={4} mb="sm">
                Notification Recipients
              </Title>
              <Text c="dimmed" size="sm" mb="sm">
                Select users who should receive notifications
              </Text>
              <MemberSelector
                members={members}
                form={form}
                maxVisibleMembers={30}
              />
            </Box>

            {/* Ticket creation notifications */}
            <Box>
              <Title order={4} mb="sm">
                Ticket Creation
              </Title>
              <Text c="dimmed" size="sm" mb="sm">
                Notifications to send when a new ticket is created
              </Text>

              <Group justify="space-between" mb="xs">
                <Text>Send email notification</Text>
                <Switch
                  {...form.getInputProps("ticketCreatedEmail", {
                    type: "checkbox",
                  })}
                />
              </Group>

              <Group justify="space-between">
                <Text>
                  Send WhatsApp notification (when session is available)
                </Text>
                <Switch
                  {...form.getInputProps("ticketCreatedWhatsapp", {
                    type: "checkbox",
                  })}
                />
              </Group>
            </Box>

            {/* Ticket assignment notifications */}
            <Box>
              <Title order={4} mb="sm">
                Ticket Assignment
              </Title>
              <Text c="dimmed" size="sm" mb="sm">
                Notifications are sent when a ticket is assigned to a user, and
                the notification is sent to the assigned user.
              </Text>

              <Group justify="space-between" mb="xs">
                <Text>Send email notification</Text>
                <Switch
                  {...form.getInputProps("ticketAssignedEmail", {
                    type: "checkbox",
                  })}
                />
              </Group>

              <Group justify="space-between">
                <Text>Send WhatsApp notification</Text>
                <Switch
                  {...form.getInputProps("ticketAssignedWhatsapp", {
                    type: "checkbox",
                  })}
                />
              </Group>
            </Box>
          </Stack>

          {updateBoardMutation.isError && (
            <Alert color="red" title="Error" mt="md">
              {updateBoardMutation.error instanceof Error
                ? updateBoardMutation.error.message
                : "Failed to save settings"}
            </Alert>
          )}

          <Group justify="flex-end" mt="xl">
            <Button
              type="submit"
              loading={updateBoardMutation.isPending}
              leftSection={<IconBell size={18} />}
            >
              Save Notification Settings
            </Button>
          </Group>
        </form>
      </PaperLayout>
    </Container>
  );
}
