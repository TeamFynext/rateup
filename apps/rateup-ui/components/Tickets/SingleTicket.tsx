import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  ActionIcon,
  Badge,
  Box,
  CloseIcon,
  Group,
  rem,
  ScrollArea,
  ScrollAreaAutosize,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconEye, IconSend } from "@tabler/icons-react";

import { useRouteParams } from "@/context/RouteParamsContext";
import useTranslations from "@/dictionaries/useTranslation";

import { useTeamMembersFromInvitation } from "../../backend/team/team.query";
import {
  IUpdateTicketRequest,
  IUpdateTicketStatusRequest,
} from "../../backend/tickets/tickets";
import {
  useCreateCommentMutation,
  useTicket,
  useUpdateTicketMutation,
  useUpdateTicketStatusMutation,
} from "../../backend/tickets/tickets.query";
import { User, useUser } from "../../context/UserContext";
import { formatIsoDateString } from "../../utils/dateTime";
import { UserRole } from "../../utils/enums";
import { TicketType } from "../../utils/enums/ticket";
import { showLoadingToast } from "../../utils/notifications";
import {
  ContainedDateInput,
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import RateupLoader from "../Loaders/RateupLoader";
import FormModalLayout from "../Modal/FormModalLayout";
import {
  PlatformIcon,
  RatingBadge,
} from "../reputationManagement/panels/RM_Review";
import { titleStyle } from "../styled/Heading/Heading";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { CommentCard } from "./SingleTicket/CommentCard";
import { PriorityMenu } from "./SingleTicket/PriorityMenu";
import { StatusMenu } from "./SingleTicket/StatusMenu";
import SurveyResponsesView from "./SingleTicket/SurveyResponsesView";
import { TicketDetailBlock } from "./SingleTicket/TicketDetailBlock";

const SingleTicket = ({ id }: { id: string }) => {
  const { update } = useRouteParams();
  const { user } = useUser();
  const {
    isLoading: ticketLoading,
    data: ticket,
    error,
    refetch,
  } = useTicket(id);

  const {
    isLoading: isLoadingMembers,
    data: teamsMembersData,
    refetch: refetchInvitedTeamMembers,
  } = useTeamMembersFromInvitation(ticket?.teamId) as UseTeamResult;

  const memberOptions = teamsMembersData?.members?.map((team) => ({
    value: team?.id,
    label: team?.name,
  }));

  const [value, setValue] = useState<string | null>(""); //for assignedToId
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [priority, setPriority] = useState(ticket?.priority || "");
  const [status, setStatus] = useState(ticket?.status || "");
  const updateTicket = useUpdateTicketMutation(id);
  const updateTicketStatus = useUpdateTicketStatusMutation(id);
  const [opened, { open: openDeadlineEdit, close: closeDeadlineModal }] =
    useDisclosure(false);
  const { translations } = useTranslations();
  useEffect(() => {
    setPriority(ticket?.priority);
    setStatus(ticket?.status);
    update({ ticketId: ticket?.title });
  }, [ticket]);

  const form = useForm({
    initialValues: {
      ticketId: id,
      createdBy: user.userId,
      msg: "",
    },
    validate: {
      msg: (value) => (value.length ? null : " * Cannot be empty"),
    },
  });

  useEffect(() => {
    if (id) form.setFieldValue("ticketId", id);
    if (user?.userId) form.setFieldValue("createdBy", user?.userId);
  }, [id, ticket]);

  useEffect(() => {
    scrollToBottom();
    setValue(ticket?.assignedToId);
  }, [ticket, memberOptions]);

  useEffect(() => {
    if (priority && ticket?.priority !== priority) {
      let data: IUpdateTicketRequest = { priority };
      showLoadingToast(
        translations["Hold..ticket is getting updated.."],
        "update-ticket",
        true,
        translations["Updating Ticket"],
      );
      updateTicket.mutate(data, {
        onSuccess: () => {
          scrollToBottom();
        },
        onError: () => {
          setPriority(ticket?.priority);
        },
      });
    }
  }, [priority]);
  useEffect(() => {
    if (value && ticket?.assignedToId !== value) {
      let data: IUpdateTicketRequest = {
        assignedToId: value,
        assignedToName:
          memberOptions?.find((member) => member.value === value)?.label ||
          "**",
      };
      showLoadingToast(
        translations["Hold..ticket is getting updated.."],
        "update-ticket",
        true,
        translations["Updating Ticket"],
      );
      updateTicket.mutate(data, {
        onSuccess: () => {
          scrollToBottom();
        },
      });
    }
  }, [value]);

  useEffect(() => {
    if (status && ticket?.status !== status) {
      let data: IUpdateTicketStatusRequest = {
        role: user.role,
        status: status,
      };
      showLoadingToast(
        translations["Hold..ticket status is getting updated.."],
        "update-status",
        true,
        translations["Updating Ticket Status"],
      );
      updateTicketStatus.mutate(data, {
        onSuccess: () => {
          scrollToBottom();
        },
        onError: () => {
          setStatus(ticket?.status);
        },
      });
    }
  }, [status]);

  function updateDeadline() {
    if (deadline && new Date(ticket?.deadline) !== deadline) {
      let data: IUpdateTicketRequest = { deadline };
      showLoadingToast(
        translations["Hold..ticket is getting updated.."],
        "update-ticket",
        true,
        translations["Updating Ticket"],
      );
      updateTicket.mutate(data, {
        onSuccess: () => {
          closeDeadlineModal();
          scrollToBottom();
        },
      });
    }
  }

  const createComment = useCreateCommentMutation(id);
  const viewport = useRef<HTMLDivElement>(null);

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
      onSettled: () => {
        scrollToBottom();
      },
      onError: (error) => {
        notifications.show({
          title: "Error",
          message: error?.response?.data?.message,
          color: "red",
        });
      },
      onSuccess: () => {
        scrollToBottom();
        form.reset();
      },
    });
  };

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
    <Stack gap={"xs"}>
      <Group p={0}>
        <Title order={4} fz={20}>
          Ticket #{ticket?.number} - {ticket?.title}
        </Title>
      </Group>
      <PaperLayout p={"xs"}>
        <Group justify="space-between" p={0}>
          <ContainedSelection
            label={translations["Assigned To :"]}
            allowDeselect={false}
            data={memberOptions}
            withAsterisk
            placeholder={
              translations["Select a team member to assign ticket to"]
            }
            value={ticket?.assignedToId}
            onChange={setValue}
            disabled={user.role !== UserRole.SUPADM}
          />
          <Group gap={"xs"}>
            <Text>{translations["Status : "]}</Text>
            <StatusMenu status={status} setStatus={setStatus} />
          </Group>
          <Group gap={"xs"}>
            <Text>{translations["Priority : "]}</Text>
            <PriorityMenu priority={priority} setPriority={setPriority} />
          </Group>
          <Stack gap={1}>
            <Group>
              <Text>{translations["Deadline: "]}</Text>
              <Text
                size="sm"
                fw="700"
                style={{ maxWidth: "300px", maxHeight: "30px" }}
              >
                {ticket?.deadline
                  ? formatIsoDateString(ticket?.deadline)
                  : "n/a"}
              </Text>
              <ActionIcon
                variant="default"
                disabled={user.role !== UserRole.SUPADM}
                onClick={openDeadlineEdit}
              >
                <IconEdit
                  style={{ width: "70%", height: "70%" }}
                  stroke={1.5}
                />
              </ActionIcon>
            </Group>
            {ticket?.deadline && (
              <Text c="orange">* {calculateDaysLeft(ticket?.deadline)}</Text>
            )}
          </Stack>

          <Tooltip label={"Team"}>
            <Badge variant="outline">{ticket?.teamName}</Badge>
          </Tooltip>
        </Group>
      </PaperLayout>

      <FormModalLayout
        opened={opened}
        onClose={closeDeadlineModal}
        title={translations["Update Deadline"]}
        centered
        onSubmit={updateDeadline}
        buttonTitle={translations["Update"]}
        includeCancelButton
      >
        <ContainedDateInput
          my="xl"
          minDate={new Date()}
          clearable
          label={translations["Deadline:"]}
          placeholder={translations["Select a deadline for the ticket"]}
          defaultValue={ticket?.deadline && new Date(ticket?.deadline)}
          onChange={(date) => setDeadline(date)}
        />
      </FormModalLayout>

      <Group w={"100%"}>
        <PaperLayout
          hoveractive
          h={460}
          p="md"
          shadow="lg"
          radius="lg"
          flex={1}
        >
          {ticketLoading ? (
            <RateupLoader mt="50px" />
          ) : (
            <>
              {ticket?.type === TicketType.REVIEW ? (
                <Stack justify="flex-start">
                  <Title order={2} c="gray.5" mb="md">
                    {translations["Review Details"]}
                  </Title>
                  <Group>
                    <PlatformIcon platform={ticket?.review?.platform} />
                    <Text>
                      {ticket?.review?.meta?.reviewedBy ||
                        translations["Anonymous"]}
                    </Text>
                  </Group>
                  <Group>
                    <Text>{translations["Rating : "]}</Text>
                    <RatingBadge rating={ticket?.review?.rating} />
                  </Group>
                  <Group>
                    <Text>{translations["Posted on : "]}</Text>
                    <Text>
                      {formatIsoDateString(ticket?.review?.reviewedAt)}
                    </Text>
                  </Group>
                  <Group>
                    <Text>{translations["Comment : "]}</Text>
                    <Text> {ticket?.review?.review || "n/a"} </Text>
                  </Group>
                  <Text lineClamp={2}>{ticket?.review?.review}</Text>
                </Stack>
              ) : ticket?.type === TicketType.SURVEY_RESPONSE ||
                ticket?.type === TicketType.FLOW_RESPONSE ? (
                <Stack>
                  <Title order={2} c="gray.5">
                    {translations["User Response Details"]}
                  </Title>
                  <ScrollArea h={380} viewportRef={viewport}>
                    {ticket?.surveyResponse?.map((response: any, index) => {
                      return (
                        <SurveyResponsesView
                          response={response}
                          question={response.question}
                          type={response.type}
                          no={index + 1}
                          language={ticket.responseLanguage}
                        />
                      );
                    })}
                  </ScrollArea>
                </Stack>
              ) : ticket?.type === TicketType.AUTOMATION ? (
                <Stack justify="flex-start">
                  <Title order={4} c="gray.5" mb="md">
                    Automation Details
                  </Title>
                  <Group pl="md">
                    <Text>Name : </Text>
                    <Text c="dark.3">
                      {ticket?.waAutomatedReplyMessage?.waAutomatedReply?.name}
                    </Text>
                  </Group>

                  <Title order={4} c="gray.5" mb="md">
                    User Details
                  </Title>
                  <Stack>
                    <Text>Phone : </Text>
                    <Text
                      c="dark.3"
                      bg="var(--shade-of-blue)"
                      p={"lg"}
                      style={{ borderRadius: "10px" }}
                    >
                      {ticket?.waAutomatedReplyMessage?.phone}
                    </Text>
                  </Stack>
                  <Stack>
                    <Text>Message: </Text>
                    <Text
                      c="dark.3"
                      bg="var(--shade-of-blue)"
                      p={"lg"}
                      style={{ borderRadius: "10px" }}
                    >
                      {ticket?.waAutomatedReplyMessage?.message}
                    </Text>
                  </Stack>
                </Stack>
              ) : (
                <Stack justify="flex-start">
                  <Title order={2} c="gray.5" mb="md">
                    {translations["Ticket Description"]}
                  </Title>
                  <Group pl="md">
                    <Text c="dark.3">{ticket?.description}</Text>
                  </Group>
                </Stack>
              )}
            </>
          )}
        </PaperLayout>

        <TicketInternalChat
          ticket={ticket}
          ticketLoading={ticketLoading}
          viewport={viewport}
          user={user}
          form={form}
          onSubmit={onSubmit}
          height={460}
        />
      </Group>
    </Stack>
  );
};

export default SingleTicket;

type ticketInternalChatProps = {
  ticket: any;
  ticketLoading: boolean;
  user: User;
  form;
  onSubmit: () => void;
  viewport: React.MutableRefObject<HTMLDivElement>;
  waInboxFlag?: boolean;
  height?: string | number;
  close?: () => void;
};
export function TicketInternalChat({
  ticket,
  ticketLoading,
  user,
  form,
  onSubmit,
  viewport,
  waInboxFlag = false,
  height = 500,
  close,
}: ticketInternalChatProps) {
  const translations = useTranslations();
  function handleKeyPress(event) {
    if (event.key === "Enter") {
      onSubmit();
    }
  }
  return (
    <PaperLayout
      hoveractive
      mih={height}
      flex={1}
      maw={400}
      miw={400}
      p="md"
      shadow="lg"
      radius="lg"
      {...(!waInboxFlag && { mah: height })}
    >
      <Stack justify="space-between" gap={0} h={"100%"}>
        <Box>
          <Group gap={0} justify="space-between">
            <Title order={4} c="gray.5" pb="sm">
              Conversation - ( {ticket?.comments?.length} Messages)
            </Title>
            {close && (
              <Group mt={-10}>
                <Tooltip label={"View Ticket Details"}>
                  <ActionIcon
                    component={Link}
                    href={`/dashboard/tickets/${ticket.id}`}
                    variant="light"
                  >
                    <IconEye />
                  </ActionIcon>
                </Tooltip>
                <ActionIcon variant="light">
                  <CloseIcon onClick={close} />
                </ActionIcon>
              </Group>
            )}
          </Group>
          {ticketLoading ? (
            <RateupLoader />
          ) : (
            <>
              <ScrollArea
                h={waInboxFlag ? "66dvh" : 335}
                viewportRef={viewport}
                pr={"xs"}
              >
                {ticket?.comments?.map((comment: any) => {
                  return (
                    <Group
                      justify={
                        comment.createdById === user.userId
                          ? "flex-end"
                          : "flex-start"
                      }
                      mb="xs"
                    >
                      <CommentCard
                        comment={comment}
                        isSender={comment.createdById === user.userId}
                      />
                    </Group>
                  );
                })}
              </ScrollArea>
            </>
          )}
        </Box>
        <Group mt="md" align="flex-start">
          <ContainedTextField
            placeholder={translations["Enter message here..."]}
            withAsterisk
            style={{ width: "83%" }}
            {...form.getInputProps("msg")}
            onKeyDown={handleKeyPress}
          />
          <ActionIcon
            onClick={onSubmit}
            title={translations["Send message"]}
            size={"lg"}
            variant="default"
            aria-label={translations["ActionIcon with size as a number"]}
          >
            <IconSend style={{ width: rem(25), height: rem(25) }} />
          </ActionIcon>
        </Group>
      </Stack>
    </PaperLayout>
  );
}
