import React, { useEffect, useMemo, useState } from "react";
import { NextRouter, useRouter } from "next/router";

import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Container,
  Grid,
  Group,
  Paper,
  ScrollAreaAutosize,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Timeline,
  Title,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import {
  IconCalendar,
  IconChevronLeft,
  IconFileDescription,
  IconHistory,
  IconListDetails,
  IconMessage,
  IconMessageCircle,
  IconUser,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import parse from "html-react-parser";
import { z } from "zod";

import { QuestionType2 } from "@/types/enums";
import {
  useCardById,
  useCreateCommentMutation,
  useUpdateCardMutation,
} from "@/backend/tickets/tickets.query";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "@/components/Button/RateupButtons";
import {
  ContainedDatePickerInput,
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import TicketTextEditor from "@/components/RichTextEditor/TicketTextEditor";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { getCellData } from "@/components/Survey/Response/WaResponses";
import SurveyResponsesView from "@/components/Tickets/SingleTicket/SurveyResponsesView";
import { markdownToPlainText } from "@/components/whatsapp/flow-v2/FlowScreensList/ScreenListItem";
import useTranslations from "@/dictionaries/useTranslation";
import { formatToRelativeTime } from "@/utils/dateTime";
import { TicketPriority, TicketType } from "@/utils/enums/ticket";

import { TicketChat } from "../../../components/Tickets/TicketChat";
import {
  Activity,
  Card,
  TicketComment,
  WaAutomatedReplyMessage,
} from "../../../components/Tickets/types";
import styles from "./customInput.module.css";

export default function CardDetailPage() {
  const router = useRouter();
  const { ticketId } = router.query as { ticketId: string };
  const { data: card, isPending, error } = useCardById(ticketId as string);

  const memberOptions = card?.ticketColumn?.ticketBoard?.team?.members?.map(
    (team) => ({
      value: team?.user?.id,
      label: team?.user?.name,
    }),
  );

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

  if (isPending) {
    return <div>Loading ticket details...</div>;
  }

  if (error) {
    return <div>Error loading ticket: {error.message}</div>;
  }

  if (!card) {
    return <div>Ticket not found</div>;
  }

  return (
    <Container size={"xl"} h={"100%"}>
      <Grid h={"100%"} p={"xs"} display={"grid"}>
        <Grid.Col span={8}>
          <PaperLayout h={"100%"} p={"xs"} radius={"md"}>
            <EditTicket
              ticket={card}
              memberOptions={memberOptions}
              router={router}
            />
            <Tabs defaultValue="comments" classNames={styles} mt={"xs"}>
              <Tabs.List>
                <Tabs.Tab
                  value="comments"
                  leftSection={<IconMessage size={12} />}
                >
                  Comments
                </Tabs.Tab>
                <Tabs.Tab
                  value="activity"
                  leftSection={<IconHistory size={12} />}
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
        <Grid.Col span={4}>
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
                  value="chat"
                  leftSection={<IconMessage size={16} />}
                  display={
                    card.surveyResponseId &&
                    card.type === TicketType.FLOW_RESPONSE
                      ? "block"
                      : "none"
                  }
                >
                  Customer Chat
                </Tabs.Tab>
                <Tabs.Tab
                  value="automation"
                  leftSection={<IconMessage size={16} />}
                  display={card.waAutomatedReplyMessageId ? "block" : "none"}
                >
                  Automation Response
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="response">
                <TicketResponse
                  surveyResponse={card.surveyResponse}
                  questions={questions}
                  type={card.type}
                />
              </Tabs.Panel>
              <Tabs.Panel value="chat" h={"calc(100vh - 110px)"}>
                <TicketChat contact={card?.surveyResponse?.Contact} />
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
      <Title order={5}>Comments</Title>
      <TicketTextEditor
        onUpdate={handleAddComment}
        content={""}
        placeholder="Add a comment..."
        saveBtn
      />
      <Stack mt={"xs"}>
        {data.map((comment) => (
          <Comment {...comment} key={comment?.id} />
        ))}
      </Stack>
    </>
  );
};

const Comment = (data: TicketComment) => {
  z;
  if (!data) return null;
  return (
    <Group align="start">
      <Avatar
        src={data?.createdBy?.profilePhoto}
        size="md"
        name={data?.createdBy?.name}
        color="ini"
      />
      <Stack w={"80%"} gap={4}>
        <Group justify="space-between">
          <Text size="xs">{data.createdBy?.name}</Text>
          <Text size="xs">{dayjs(data.createdAt).format("DD/MM/YYYY")}</Text>
        </Group>
        <div>{parse(data.text)}</div>
      </Stack>
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
  assignedToId: z.string().optional(),
  priority: z.string().optional(),
  deadline: z
    .date({
      required_error: "Deadline is required",
      invalid_type_error: "Invalid date format",
    })
    .nullable(),
  description: z.string().optional(),
});

export type TicketFormValues = z.infer<typeof ticketSchema>;

const EditTicket = ({
  ticket,
  memberOptions,
  router,
}: {
  ticket: Card;
  memberOptions: any[];
  router: NextRouter;
}) => {
  const { translations } = useTranslations();
  const { mutate } = useUpdateCardMutation();
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">(
    "idle",
  );
  const initialValues = {
    id: ticket.id,
    title: ticket.title || "",
    assignedToId: ticket.assignedToId || "",
    priority: ticket.priority || "",
    deadline: ticket.deadline ? new Date(ticket.deadline) : null,
    description: ticket.description || "",
  };
  const form = useForm<TicketFormValues>({
    validate: zodResolver(ticketSchema),
    initialValues,
  });

  const [debouncedFormValues] = useDebouncedValue(form.values, 800);

  useEffect(() => {
    // Skip the initial render
    if (debouncedFormValues === initialValues) return;

    setSaveStatus("saving");
    mutate(debouncedFormValues, {
      onSuccess: () => {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      },
      onError: () => setSaveStatus("idle"),
    });
  }, [debouncedFormValues, mutate]);

  const handleDescriptionUpdate = (content: string) => {
    form.setFieldValue("description", content);
  };

  return (
    <form>
      <Group justify="space-between">
        <Group gap={"xs"}>
          <ActionIcon
            radius={"lg"}
            variant="filled"
            title="Go Back"
            onClick={() => router.back()}
          >
            <IconChevronLeft />
          </ActionIcon>
          {[
            { title: "Ticket Id", btnTitle: `#${ticket.ticketId}` },
            {
              title: "Created Date",
              btnTitle: dayjs(ticket.createdAt).format("DD/MM/YYYY"),
            },
          ].map((ctx, i) => (
            <Group key={i} gap={4}>
              <Text size="sm"> {ctx.title}:</Text>
              <Badge variant="light" radius={"xs"}>
                {ctx.btnTitle}
              </Badge>
            </Group>
          ))}
        </Group>
        {saveStatus !== "idle" && (
          <Badge
            color={saveStatus === "saved" ? "teal" : "blue"}
            variant="light"
            size="sm"
          >
            {saveStatus === "saved" ? "Changes saved" : "Saving..."}
          </Badge>
        )}
      </Group>
      <SimpleGrid cols={4}>
        <ContainedTextField
          label={"Ticket Name"}
          placeholder={translations["Enter Ticket Name"]}
          required
          classNames={styles}
          {...form.getInputProps("title")}
        />
        <ContainedSelection
          allowDeselect={false}
          data={memberOptions}
          label={translations["Assign to"]}
          style={{ minWidth: "32%" }}
          placeholder={translations["Select a team staff to assign ticket to"]}
          classNames={styles}
          {...form.getInputProps("assignedToId")}
        />
        <ContainedSelection
          allowDeselect={false}
          data={Object.values(TicketPriority)}
          label={translations["Priority"]}
          style={{ minWidth: "30%" }}
          placeholder={translations["Select priority for the ticket"]}
          classNames={styles}
          {...form.getInputProps("priority")}
        />
        <ContainedDatePickerInput
          label={translations["Deadline:"]}
          placeholder={translations["Select a deadline for the ticket"]}
          rightSection={<IconCalendar />}
          classNames={styles}
          minDate={new Date()}
          {...form.getInputProps("deadline")}
        />
      </SimpleGrid>
      <Box>
        <Text className={styles.label}>Description</Text>
        <TicketTextEditor
          content={form.values.description}
          onUpdate={handleDescriptionUpdate}
          placeholder="Add a description..."
        />
      </Box>
    </form>
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
                Customer Message
              </Text>
              <Paper bg="var(--shade-of-blue)" p="xs" radius="sm" withBorder>
                {response?.message || "No message content"}
              </Paper>
            </Box>
          </Group>

          <Group>
            <IconListDetails size={20} color="gray" />
            <Box>
              <Text size="sm" fw={500} mb={2}>
                Current Screen
              </Text>
              <Text>{response?.currentScreen || "Not specified"}</Text>
            </Box>
          </Group>
        </Stack>
      </Stack>
    </ScrollAreaAutosize>
  );
};
