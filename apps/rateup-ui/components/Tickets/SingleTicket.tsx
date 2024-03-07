import React, { useEffect, useRef, useState } from "react";
import {
  useCreateCommentMutation,
  useTicket,
  useUpdateTicketMutation,
  useUpdateTicketStatusMutation,
} from "../../backend/tickets/tickets.query";
import {
  Group,
  Stack,
  Text,
  Title,
  ActionIcon,
  rem,
  ScrollArea,
} from "@mantine/core";
import { titleStyle } from "../styled/Heading/Heading";
import { useUser } from "../../context/UserContext";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import { IconSend } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IUpdateTicketRequest,
  IUpdateTicketStatusRequest,
} from "../../backend/tickets/tickets";
import { showLoadingToast } from "../../utils/notifications";
import {
  formatIsoDateString,
  formatIsoDateStringWithTime,
} from "../../utils/dateTime";
import {
  PlatformIcon,
  RatingBadge,
} from "../reputationManagement/panels/RM_Review";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { StatusMenu } from "./SingleTicket/StatusMenu";
import { TicketDetailBlock } from "./SingleTicket/TicketDetailBlock";
import { PriorityMenu } from "./SingleTicket/PriorityMenu";
import { CommentCard } from "./SingleTicket/CommentCard";
import { TicketType } from "../../utils/enums/ticket";
import SurveyResponsesView from "./SingleTicket/SurveyResponsesView";
import RateupLoader from "../Loaders/RateupLoader";

const SingleTicket = ({ id }: { id: string }) => {
  const { user } = useUser();
  const {
    isLoading: ticketLoading,
    data: ticket,
    error,
    refetch,
  } = useTicket(id);

  const [priority, setPriority] = useState(ticket?.priority || "");
  const [status, setStatus] = useState(ticket?.status || "");
  const updateTicket = useUpdateTicketMutation(id);
  const updateTicketStatus = useUpdateTicketStatusMutation(id);

  useEffect(() => {
    setPriority(ticket?.priority);
    setStatus(ticket?.status);
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
  }, [ticket]);

  useEffect(() => {
    if (priority && ticket?.priority !== priority) {
      let data: IUpdateTicketRequest = { priority };
      showLoadingToast(
        "Hold..ticket is getting updated..",
        "update-ticket",
        true,
        "Updating Ticket",
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
    if (status && ticket?.status !== status) {
      let data: IUpdateTicketStatusRequest = {
        role: user.role,
        status: status,
      };
      showLoadingToast(
        "Hold..ticket status is getting updated..",
        "update-status",
        true,
        "Updating Ticket Status",
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

  return (
    <Stack mt="-20px">
      <Group>
        <Title
          order={2}
          style={{ ...titleStyle, width: "600px", maxWidth: "600px" }}
        >
          Ticket #{ticket?.number} &nbsp;&nbsp;&nbsp; -&nbsp;&nbsp;&nbsp;{" "}
          {ticket?.title}
        </Title>
      </Group>

      <Group justify="flex-start" gap="10" mt="-1px">
        <TicketDetailBlock>
          <Text>Team :</Text>
          <Text size="xl" fw="700">
            {ticket?.teamName}
          </Text>
        </TicketDetailBlock>
        <TicketDetailBlock>
          <Text>Status</Text>
          <StatusMenu status={status} setStatus={setStatus} />
        </TicketDetailBlock>
        <TicketDetailBlock>
          <Text>Priority</Text>
          <PriorityMenu priority={priority} setPriority={setPriority} />
        </TicketDetailBlock>
        <TicketDetailBlock>
          <Text>Deadline: </Text>
          <Text
            size="sm"
            fw="700"
            style={{ maxWidth: "130px", maxHeight: "30px" }}
          >
            {ticket?.deadline
              ? formatIsoDateStringWithTime(ticket?.deadline)
              : "n/a"}
          </Text>
        </TicketDetailBlock>
      </Group>

      <Group gap={30} mb="lg">
        <PaperLayout
          hoveractive
          mah={500}
          mih={500}
          maw={680}
          p="md"
          shadow="lg"
          radius="lg"
        >
          {ticketLoading ? (
            <RateupLoader mt="50px" />
          ) : (
            <>
              {ticket?.type === TicketType.REVIEW ? (
                <Stack justify="flex-start">
                  <Title order={2} c="gray.5" mb="md">
                    Review Details
                  </Title>
                  <Group>
                    <PlatformIcon platform={ticket?.review?.platform} />
                    <Text>
                      {ticket?.review?.meta?.reviewedBy || "Anonymous"}
                    </Text>
                  </Group>
                  <Group>
                    <Text>Rating : </Text>
                    <RatingBadge rating={ticket?.review?.rating} />
                  </Group>
                  <Group>
                    <Text>Posted on : </Text>
                    <Text>
                      {formatIsoDateString(ticket?.review?.reviewedAt)}
                    </Text>
                  </Group>
                  <Group>
                    <Text>Comment : </Text>
                    <Text> {ticket?.review?.review || "n/a"} </Text>
                  </Group>
                  <Text lineClamp={2}>{ticket?.review?.review}</Text>
                </Stack>
              ) : (
                <Stack>
                  <Title order={2} c="gray.5">
                    User Response Details
                  </Title>
                  <ScrollArea h={380} viewportRef={viewport}>
                    {ticket?.surveyResponse.map((response: any, index) => {
                      return (
                        <SurveyResponsesView
                          response={response}
                          question={{
                            title: response.questionTitle,
                            id: response.questionId,
                          }}
                          type={response.type}
                          no={index + 1}
                        />
                      );
                    })}
                  </ScrollArea>
                </Stack>
              )}
            </>
          )}
        </PaperLayout>

        <Stack>
          <PaperLayout
            hoveractive
            mah={500}
            mih={500}
            maw={400}
            miw={400}
            p="md"
            shadow="lg"
            radius="lg"
          >
            <Title order={4} c="gray.5" pb="sm">
              Conversation - ( {ticket?.comments?.length} Messages)
            </Title>
            {ticketLoading ? (
              <RateupLoader />
            ) : (
              <>
                <ScrollArea h={360} viewportRef={viewport}>
                  {ticket?.comments?.map((comment: any) => {
                    return (
                      <Group
                        justify={
                          comment.createdBy.id === user.userId
                            ? "flex-end"
                            : "flex-start"
                        }
                        mb="xs"
                      >
                        <CommentCard
                          comment={comment}
                          isSender={comment.createdBy.id === user.userId}
                        />
                      </Group>
                    );
                  })}
                </ScrollArea>
                <Group mt="md" align="flex-start">
                  <ContainedTextField
                    placeholder={"Enter message here..."}
                    withAsterisk
                    style={{ width: "83%" }}
                    {...form.getInputProps("msg")}
                  />
                  <ActionIcon
                    onClick={onSubmit}
                    title="Send message"
                    style={{ width: "12%" }}
                    size={45}
                    variant="default"
                    aria-label="ActionIcon with size as a number"
                  >
                    <IconSend style={{ width: rem(25), height: rem(25) }} />
                  </ActionIcon>
                </Group>
              </>
            )}
          </PaperLayout>
        </Stack>
      </Group>
    </Stack>
  );
};

export default SingleTicket;
