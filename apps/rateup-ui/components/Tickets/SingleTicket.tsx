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
import {
  ContainedDateInput,
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import { IconEdit, IconSend } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IUpdateTicketRequest,
  IUpdateTicketStatusRequest,
} from "../../backend/tickets/tickets";
import { showLoadingToast } from "../../utils/notifications";
import { formatIsoDateString } from "../../utils/dateTime";
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
import { useTeamMembersFromInvitation } from "../../backend/team/team.query";
import { useUser } from "../../context/UserContext";
import { UserRole } from "../../utils/enums";
import { useDisclosure } from "@mantine/hooks";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import FormModalLayout from "../Modal/FormModalLayout";

const SingleTicket = ({ id }: { id: string }) => {
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
    setValue(ticket?.assignedToId);
  }, [ticket, memberOptions]);

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
    if (value && ticket?.assignedToId !== value) {
      let data: IUpdateTicketRequest = {
        assignedToId: value,
        assignedToName:
          memberOptions?.find((member) => member.value === value)?.label ||
          "**",
      };
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

  function updateDeadline() {
    if (deadline && new Date(ticket?.deadline) !== deadline) {
      let data: IUpdateTicketRequest = { deadline };
      showLoadingToast(
        "Hold..ticket is getting updated..",
        "update-ticket",
        true,
        "Updating Ticket",
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

  function handleKeyPress(event) {
    if (event.key === "Enter") {
      onSubmit();
    }
  }

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
        <TicketDetailBlock mawInp="400" miwInput="85" pt="lg">
          <Text>Team :</Text>
          <Text size="xl" fw="700">
            {ticket?.teamName}
          </Text>
        </TicketDetailBlock>
        <TicketDetailBlock mawInp="400" miwInput="85">
          <Text>Assigned To :</Text>
          <ContainedSelection
            allowDeselect={false}
            data={memberOptions}
            withAsterisk
            my="0"
            placeholder="Select a team member to assign ticket to"
            value={ticket?.assignedToId}
            onChange={setValue}
            defaultChecked={ticket?.assignedTo}
            disabled={user.role !== UserRole.SUPADM}
          />
        </TicketDetailBlock>
      </Group>
      <Group justify="flex-start" gap="10" mt="-1px">
        <TicketDetailBlock>
          <Text>Status : </Text>
          <StatusMenu status={status} setStatus={setStatus} />
        </TicketDetailBlock>
        <TicketDetailBlock>
          <Text>Priority : </Text>
          <PriorityMenu priority={priority} setPriority={setPriority} />
        </TicketDetailBlock>
        <TicketDetailBlock mawInp="320">
          <Text>Deadline: </Text>
          <Text
            size="sm"
            fw="700"
            style={{ maxWidth: "300px", maxHeight: "30px" }}
          >
            {ticket?.deadline ? formatIsoDateString(ticket?.deadline) : "n/a"}
          </Text>
          <ActionIcon
            variant="default"
            disabled={user.role !== UserRole.SUPADM}
            onClick={openDeadlineEdit}
          >
            <IconEdit style={{ width: "70%", height: "70%" }} stroke={1.5} />
          </ActionIcon>
        </TicketDetailBlock>
      </Group>

      <FormModalLayout
        opened={opened}
        onClose={closeDeadlineModal}
        title={"Update Deadline"}
        centered
        onSubmit={updateDeadline}
        buttonTitle={"Update"}
        includeCancelButton
      >
        <ContainedDateInput
          my="xl"
          minDate={new Date()}
          clearable
          label={"Deadline:"}
          placeholder="Select a deadline for the ticket"
          defaultValue={new Date(ticket?.deadline)}
          onChange={(date) => setDeadline(date)}
        />
      </FormModalLayout>

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
                    onKeyDown={handleKeyPress}
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
