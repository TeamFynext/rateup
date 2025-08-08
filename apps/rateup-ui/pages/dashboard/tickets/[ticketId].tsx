import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NextRouter, useRouter } from "next/router";

import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Collapse,
  Container,
  Grid,
  Group,
  Paper,
  Popover,
  ScrollAreaAutosize,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Timeline,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import {
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconFileDescription,
  IconHistory,
  IconListDetails,
  IconMessage,
  IconMessageCircle,
  IconPlus,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import parse from "html-react-parser";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { z } from "zod/v4";

import { QuestionType2 } from "@/types/enums";
import {
  useCardById,
  useCardTeamMembersById,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useUpdateCardMutation,
} from "@/backend/tickets/tickets.query";
import {
  ContainedDatePickerInput,
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import TicketTextEditor from "@/components/RichTextEditor/TicketTextEditor";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { getCellData } from "@/components/Survey/Response/WaResponses";
import ShareLink from "@/components/Tickets/ShareLink";
import SurveyResponsesView from "@/components/Tickets/SingleTicket/SurveyResponsesView";
import { markdownToPlainText } from "@/components/whatsapp/flow-v2/FlowScreensList/ScreenListItem";
import { useUser } from "@/context/UserContext";
import useTranslations from "@/dictionaries/useTranslation";
import { formatDate, formatToRelativeTime } from "@/utils/dateTime";
import { TicketPriority, TicketType } from "@/utils/enums/ticket";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import { TicketChat } from "../../../components/Tickets/TicketChat";
import {
  Activity,
  Card,
  TicketComment,
  WaAutomatedReplyMessage,
} from "../../../components/Tickets/types";
import styles from "./customInput.module.css";
import styles2 from "./ticketPriority.module.css";

export default function CardDetailPage() {
  const router = useRouter();
  const { ticketId } = router.query as { ticketId: string };
  const { data: card, isPending, error } = useCardById(ticketId as string);

  const questions = useMemo(() => {
    return card?.surveyResponse?.surveyTeamMap?.survey?.WaFlow?.json?.screens?.flatMap(
      (screen) =>
        screen.layout.children
          .filter((child) => child.type !== QuestionType2.Footer)
          .map(
            ({
              id,
              label,
              metaType,
              name,
              "data-source": dataSource,
              header,
            }: any) => ({
              id,
              label,
              metaType,
              dataSource,
              name,
              header,
            }),
          )
          .filter(({ name }) => name),
    );
  }, [card]);

  if (isPending) return <RateupLoader h={"100%"} />;

  if (error) {
    return <div>Error loading ticket: {error.message}</div>;
  }

  if (!card) {
    return <div>Ticket not found</div>;
  }

  return (
    <Container size={1800} h={"100%"}>
      <Grid h={"100%"} p={"xs"} display={"grid"}>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <PaperLayout h={"100%"} p={"xs"} radius={"md"}>
            <EditTicket ticket={card} router={router} ticketId={ticketId} />
            <Tabs defaultValue="comments" classNames={styles} mt={"xl"}>
              <Tabs.List c={"gray.7"}>
                <Tabs.Tab
                  value="comments"
                  fw={500}
                  leftSection={<IconMessage size={19} />}
                >
                  Comments
                </Tabs.Tab>
                <Tabs.Tab
                  value="activity"
                  fw={500}
                  leftSection={<IconHistory size={19} />}
                >
                  Activity
                </Tabs.Tab>
              </Tabs.List>

              <ScrollAreaAutosize mah={"calc(100vh - 360px)"}>
                <Tabs.Panel value="comments">
                  <TicketComments
                    data={card?.ticketComments}
                    ticketCardId={ticketId}
                  />
                </Tabs.Panel>
                <Tabs.Panel value="activity">
                  <TicketActivity activities={card?.ticketActivities} />
                </Tabs.Panel>
              </ScrollAreaAutosize>
            </Tabs>
          </PaperLayout>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <PaperLayout h={"100%"} p={"xs"} radius={"md"}>
            <Tabs
              defaultValue={
                card.waAutomatedReplyMessageId
                  ? "automation"
                  : card.surveyResponseId
                    ? "response"
                    : ""
              }
              classNames={styles}
              h={"100%"}
            >
              <Tabs.List>
                <Tabs.Tab
                  value="response"
                  leftSection={<IconFileDescription size={16} />}
                  display={card.surveyResponseId ? "block" : "none"}
                >
                  Response Details
                </Tabs.Tab>
                <Tabs.Tab
                  value="automation"
                  leftSection={<IconMessage size={16} />}
                  display={card.waAutomatedReplyMessageId ? "block" : "none"}
                >
                  Automation Response
                </Tabs.Tab>
                <Tabs.Tab
                  value="chat"
                  leftSection={<IconMessage size={16} />}
                  display={
                    card.type === TicketType.AUTOMATION ||
                    card.type === TicketType.FLOW_RESPONSE
                      ? "block"
                      : "none"
                  }
                >
                  Customer Chat
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="response">
                <TicketResponse
                  surveyResponse={card.surveyResponse}
                  questions={questions}
                  type={card.type}
                />
              </Tabs.Panel>
              <Tabs.Panel value="chat" h={"calc(100vh - 130px)"}>
                <TicketChat
                  contact={
                    card.surveyResponseId
                      ? card?.surveyResponse?.Contact
                      : card?.waAutomatedReplyMessage?.contact
                  }
                />
              </Tabs.Panel>
              <Tabs.Panel value="automation">
                <TicketAutomationResponse
                  response={card.waAutomatedReplyMessage}
                />
              </Tabs.Panel>
            </Tabs>
          </PaperLayout>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

const TicketComments = ({
  data,
  ticketCardId,
}: {
  data: Array<TicketComment>;
  ticketCardId: string;
}) => {
  const { mutate } = useCreateCommentMutation(ticketCardId);
  const handleAddComment = (comment: string) => {
    mutate({
      msg: comment,
      ticketCardId,
    });
  };
  return (
    <>
      <Title size={18} c={"gray.7"} my={12} fw={700} order={5}>
        Comments
      </Title>
      <TicketTextEditor
        onUpdate={handleAddComment}
        content={""}
        placeholder="Add a comment..."
        saveBtn
      />
      <Stack mt={"xs"}>
        {data.map((comment) => (
          <Comment {...comment} key={comment?.id} cardId={ticketCardId} />
        ))}
      </Stack>
    </>
  );
};

const Comment = (
  data: TicketComment & {
    cardId: string;
  },
) => {
  const { user } = useUser();
  const { mutate, isPending } = useDeleteCommentMutation(data.cardId);
  if (!data) return null;
  return (
    <Group align="start">
      <Avatar
        src={data?.createdBy?.profilePhoto}
        size="md"
        name={data?.createdBy?.name}
        color="initials"
      />
      <Stack w={"85%"} gap={0}>
        <Group gap={"xs"}>
          <Text fz={14} tt={"capitalize"}>
            {data.createdBy?.name}
          </Text>
          <Text fz={12} c={"var(--grey-color-6)"}>
            {formatToRelativeTime(data.createdAt)}
          </Text>
        </Group>
        <div
          style={{
            fontSize: 14,
          }}
        >
          {parse(data.text)}
        </div>
      </Stack>
      {data?.createdById === user?.userId && (
        <ActionIcon
          variant="light"
          size={"xs"}
          disabled={isPending}
          onClick={() => mutate(data.id)}
        >
          <IconTrash />
        </ActionIcon>
      )}
    </Group>
  );
};

const TicketActivity = ({ activities }: { activities: Array<Activity> }) => {
  return (
    activities &&
    activities.length > 0 && (
      <Stack gap="xs">
        <Title order={5}>Activity History</Title>
        <Timeline active={0} bulletSize={24} lineWidth={2}>
          {activities.map((activity) => {
            let title = "";
            let icon = <IconListDetails size={12} />;

            switch (activity.type) {
              case "ADDED_CARD":
                title = `${activity.user?.name ?? "System"} added this card to ${activity.details?.title || "a column"}`;
                icon = <IconListDetails size={12} />;
                break;
              case "ADDED_MEMBER":
                title = `${activity.user?.name} added ${activity.details?.memberName || "someone"} to this card`;
                icon = <IconUser size={12} />;
                break;
              case "EDITED_CARD":
                title = `${activity.user?.name} edited this card`;
                icon = <IconUser size={12} />;
                break;
              case "MOVED_CARD":
                title = `${activity.user?.name} moved this card from ${activity.details?.fromColumnName || "a column"} to ${activity.details?.toColumnName || "another column"}`;
                icon = <IconListDetails size={12} />;
                break;
              default:
                title = `${activity.user?.name} updated this card`;
            }

            return (
              <Timeline.Item
                key={activity.id}
                bullet={icon}
                title={title}
                mt={"xs"}
              >
                <Text c="dimmed" size="xs">
                  {formatToRelativeTime(activity.timestamp)}
                </Text>
              </Timeline.Item>
            );
          })}
        </Timeline>
      </Stack>
    )
  );
};

const ticketSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  assignedToIds: z.array(z.string()),
  priority: z.string().optional(),
  deadline: z
    .date({
      error: (issue) =>
        issue.input === undefined ? "Deadline required" : "Invalid Date Format",
    })
    .nullable(),
  description: z.string().optional(),
});

export type TicketFormValues = z.infer<typeof ticketSchema>;

const EditTicket = ({
  ticket,
  router,
  ticketId,
}: {
  ticket: Card;
  router: NextRouter;
  ticketId: string;
}) => {
  const { translations } = useTranslations();
  const { mutate } = useUpdateCardMutation();
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">(
    "idle",
  );
  const [showEditor, setShowEditor] = useState(false);
  const { data: members = [], isPending: isMembersLoading } =
    useCardTeamMembersById(ticketId);

  const initialValues = useMemo(
    () => ({
      id: ticket.id,
      title: ticket.title || "",
      assignedToIds: ticket.assignees?.map((item) => item.assigneeId) || [],
      priority: ticket.priority || "",
      deadline: ticket.deadline ? new Date(ticket.deadline) : null,
      description: ticket.description || "",
    }),
    [ticket],
  );

  const form = useForm<TicketFormValues>({
    validate: zod4Resolver(ticketSchema),
    initialValues,
  });

  const [debouncedFormValues] = useDebouncedValue(form.values, 800);

  useEffect(() => {
    if (JSON.stringify(debouncedFormValues) === JSON.stringify(initialValues))
      return;

    setSaveStatus("saving");
    mutate(debouncedFormValues, {
      onSuccess: () => {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      },
      onError: () => setSaveStatus("idle"),
    });
  }, [debouncedFormValues, initialValues, mutate]);

  const handleDescriptionUpdate = useCallback(
    (content: string) => {
      form.setFieldValue("description", content);
    },
    [form],
  );

  const toggleMember = useCallback(
    (userId: string) => {
      const currentMembers = form.values.assignedToIds || [];
      const isSelected = currentMembers.includes(userId);

      form.setFieldValue(
        "assignedToIds",
        isSelected
          ? currentMembers.filter((id) => id !== userId)
          : [...currentMembers, userId],
      );
    },
    [form],
  );

  const visibleMembers = useMemo(() => {
    return form.values.assignedToIds
      ?.slice(0, 3)
      .map((memberId) => members.find((u) => u.id === memberId))
      .filter(Boolean);
  }, [form.values.assignedToIds, members]);

  const hiddenMembersCount = Math.max(
    0,
    (form.values.assignedToIds?.length || 0) - 3,
  );

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case "LOW":
        return styles2.lowPriority;
      case "MEDIUM":
        return styles2.mediumPriority;
      case "HIGH":
        return styles2.highPriority;
      case "CRITICAL":
        return styles2.criticalPriority;
      default:
        return "";
    }
  };

  if (isMembersLoading)
    return <RateupLoader aria-label="Loading ticket members" />;

  return (
    <form aria-label="Edit ticket form">
      <Container size="lg" px="xs">
        <Group justify="space-between" my="md" w="100%">
          <Group gap="md">
            <Tooltip label="Go back">
              <ActionIcon
                radius="lg"
                variant="filled"
                onClick={() => router.back()}
                aria-label="Go back"
              >
                <IconChevronLeft />
              </ActionIcon>
            </Tooltip>

            <Group gap={4} mx={8}>
              <Text size="sm">Created Date:</Text>
              <Badge variant="light" c={"gray.7"} radius="xs">
                {formatDate(ticket.createdAt)}
              </Badge>
            </Group>
          </Group>
          <Group>
            {saveStatus !== "idle" && (
              <Badge
                color={saveStatus === "saved" ? "teal" : "blue"}
                variant="light"
                size="sm"
                aria-live="polite"
              >
                {saveStatus === "saved" ? "Changes saved" : "Saving..."}
              </Badge>
            )}
            <ShareLink />
          </Group>
        </Group>
      </Container>

      <Container>
        <SimpleGrid cols={{ base: 2, lg: 4 }} spacing="sm">
          <ContainedTextField
            fw={500}
            label="Ticket Name"
            placeholder={translations["Enter Ticket Name"]}
            required
            classNames={styles}
            aria-required="true"
            {...form.getInputProps("title")}
          />

          <div>
            <Text className={styles.label}>Members</Text>
            <MemberSelector form={form} members={members} />
          </div>

          <ContainedSelection
            allowDeselect={false}
            data={Object.values(TicketPriority)}
            label={translations["Priority"]}
            placeholder={translations["Select priority for the ticket"]}
            {...form.getInputProps("priority")}
            rightSection={<IconChevronDown size={16} />}
            classNames={{
              input: `${styles2.priorityInput} ${getPriorityClass(form.values.priority)}`,
            }}
          />

          <ContainedDatePickerInput
            label={translations["Deadline:"]}
            placeholder={"mm/dd/yyyy"}
            rightSection={
              <IconCalendar color="var(--mantine-color-blue-4)" size={19} />
            }
            classNames={styles}
            minDate={new Date()}
            clearable
            {...form.getInputProps("deadline")}
          />

          <Box>
            <Button
              type="button"
              variant="light"
              color="teal.7"
              fw={500}
              onClick={() => setShowEditor(!showEditor)}
              leftSection={
                showEditor ? <IconX size={16} /> : <IconPlus size={16} />
              }
            >
              {showEditor ? "Close editor" : "Add description"}
            </Button>
          </Box>
        </SimpleGrid>
        <Collapse in={showEditor}>
          <Box mt="md">
            <Text className={styles.label}>Description</Text>
            <TicketTextEditor
              content={form.values.description}
              onUpdate={handleDescriptionUpdate}
              placeholder="Add a description..."
            />
          </Box>
        </Collapse>
      </Container>
    </form>
  );
};

export const MemberSelector = ({
  members,
  form,
  maxVisibleMembers = 3,
}: {
  members: Array<{ id: string; name: string; profilePhoto?: string }>;
  form: any;
  maxVisibleMembers?: number;
}) => {
  const toggleMember = useCallback(
    (userId: string) => {
      const currentMembers = form.values.assignedToIds || [];
      const isSelected = currentMembers.includes(userId);

      form.setFieldValue(
        "assignedToIds",
        isSelected
          ? currentMembers.filter((id) => id !== userId)
          : [...currentMembers, userId],
      );
    },
    [form],
  );

  const visibleMembers = useMemo(() => {
    return form.values.assignedToIds
      ?.slice(0, maxVisibleMembers)
      .map((memberId) => members.find((u) => u.id === memberId))
      .filter(Boolean);
  }, [form.values.assignedToIds, maxVisibleMembers, members]);

  const hiddenMembersCount = Math.max(
    0,
    (form.values.assignedToIds?.length || 0) - maxVisibleMembers,
  );
  return (
    <Group gap="xs">
      <Avatar.Group>
        {visibleMembers?.map((user) => (
          <Tooltip label={user?.name} key={user.id} withArrow>
            <Avatar
              color="initials"
              radius="xl"
              name={user?.name}
              src={getFileUrlFromKey(user.profilePhoto)}
            />
          </Tooltip>
        ))}
        {hiddenMembersCount > 0 && (
          <Avatar
            color="gray"
            radius="xl"
            title={`${hiddenMembersCount} more members`}
          >
            +{hiddenMembersCount}
          </Avatar>
        )}
      </Avatar.Group>

      <Popover position="bottom" withArrow>
        <Popover.Target>
          <Tooltip label="Add or remove members">
            <Avatar radius="xl" my={3} style={{ cursor: "pointer" }}>
              <IconPlus size={16} />
            </Avatar>
          </Tooltip>
        </Popover.Target>

        <Popover.Dropdown p="xs" w={200}>
          <ScrollAreaAutosize mah={200}>
            {members.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                No members available to add
              </Text>
            ) : (
              members.map((user) => {
                const isSelected = form.values?.assignedToIds?.includes(
                  user.id,
                );
                return (
                  <Button
                    key={user.id}
                    variant="subtle"
                    fullWidth
                    justify="space-between"
                    onClick={() => toggleMember(user.id)}
                    leftSection={
                      <Group gap="xs" wrap="nowrap">
                        <Avatar
                          src={getFileUrlFromKey(user.profilePhoto)}
                          size="sm"
                          radius="xl"
                          name={user.name}
                          color="initials"
                        />
                        <Text size="sm">{user.name}</Text>
                      </Group>
                    }
                    rightSection={isSelected ? <IconCheck size={16} /> : null}
                    aria-pressed={isSelected}
                    aria-label={`Toggle ${user.name}`}
                  />
                );
              })
            )}
          </ScrollAreaAutosize>
        </Popover.Dropdown>
      </Popover>
    </Group>
  );
};

const TicketResponse = ({
  surveyResponse,
  questions,
  type,
}: {
  surveyResponse: any;
  questions: Array<{
    id: string;
    label: string;
    metaType: string;
    name: string;
    dataSource?: Array<any>;
    header?: string;
  }>;
  type: TicketType;
}) => {
  return (
    <ScrollAreaAutosize mah={"90dvh"}>
      <Stack p={"sm"}>
        {type === TicketType.SURVEY_RESPONSE ? (
          <Stack gap="xs">
            {surveyResponse?.responses?.map((response: any, index) => {
              let question =
                surveyResponse?.surveyTeamMap?.survey?.questions?.find(
                  (q) => q.id === response.questionId,
                );
              if (!question) return null;
              return (
                <SurveyResponsesView
                  response={response}
                  question={question}
                  type={response.type}
                  no={index + 1}
                  language={surveyResponse?.language}
                  key={index}
                />
              );
            })}
          </Stack>
        ) : (
          questions?.map((question, index) => (
            <Stack key={question.id} gap={8}>
              <Group>
                <Badge>{index + 1}</Badge>
                <Text size="sm">
                  {markdownToPlainText(question.header || question.label)}
                </Text>
              </Group>
              <Text
                size="sm"
                bg={"var(--ticket-bg)"}
                py={5}
                px={"sm"}
                style={{
                  borderRadius: 4,
                }}
              >
                {getCellData(
                  surveyResponse?.responses?.find(
                    (res) => res.questionId === question.id,
                  )?.response,
                  question,
                )}
              </Text>
            </Stack>
          ))
        )}
      </Stack>
    </ScrollAreaAutosize>
  );
};

const TicketAutomationResponse = ({
  response,
}: {
  response: WaAutomatedReplyMessage;
}) => {
  return (
    <ScrollAreaAutosize mah={"90dvh"}>
      <Stack p={"sm"} gap={"md"}>
        <Group justify="space-between">
          <Title order={5}>Automation Details</Title>
          <Badge variant="light" color="blue">
            {response?.waAutomatedReply?.name || "Unnamed Automation"}
          </Badge>
        </Group>

        <Stack gap="md">
          <Group>
            <IconUser size={20} color="gray" />
            <Box>
              <Text size="sm" fw={500} mb={2}>
                Phone Number
              </Text>
              <Text>{response?.phone || "N/A"}</Text>
            </Box>
          </Group>

          <Group>
            <IconMessageCircle size={20} color="gray" />
            <Box>
              <Text size="sm" fw={500} mb={2}>
                Customer Response
              </Text>
              <Paper bg="var(--shade-of-blue)" p="xs" radius="sm" withBorder>
                {response?.response?.value || "No message content"}
              </Paper>
            </Box>
          </Group>

          <Group>
            <IconListDetails size={20} color="gray" />
            <Box>
              <Text size="sm" fw={500} mb={2}>
                Action
              </Text>
              <Text>{response?.response?.action || "Not specified"}</Text>
            </Box>
          </Group>
        </Stack>
      </Stack>
    </ScrollAreaAutosize>
  );
};
