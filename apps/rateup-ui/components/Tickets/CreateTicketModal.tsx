"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Group, Stack } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useTeamMembersFromInvitation } from "../../backend/team/team.query";
import {
  useBoard,
  useBoardQueries,
  useCreateTicketMutation,
  useTicket,
} from "../../backend/tickets/tickets.query";
import { TicketType } from "../../utils/enums/ticket";
import { RateupButtonBlue } from "../Button/RateupButtons";
import {
  ContainedDateInput,
  ContainedSelection,
  ContainedTextArea,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../input/TeamSelector";
import FormModalLayout from "../Modal/FormModalLayout";
import Loading from "../Page/Loading";

interface iProps {
  createTicketOpened: boolean;
  closeTicketModal: any;
  selectedTeamId: string;
  type: string;
  rid?: string;
  surveyResponseId?: string;
}
const CreateTicketModal = ({
  createTicketOpened,
  closeTicketModal,
  selectedTeamId,
  type,
  rid,
  surveyResponseId,
}: iProps) => {
  let isCustomTicket = type === TicketType.CUSTOM;
  const translations = useTranslations();
  const router = useRouter();
  const form = useForm({
    initialValues: {
      title:
        type === TicketType.REVIEW
          ? translations("Review Ticket")
          : isCustomTicket
            ? ""
            : translations("Survey Response Ticket"),
      type:
        type === TicketType.REVIEW
          ? TicketType.REVIEW
          : isCustomTicket
            ? TicketType.CUSTOM
            : TicketType.SURVEY_RESPONSE,
      firstComment: "",
      assignedToId: "",
      priority: "",
      teamId: selectedTeamId,
      deadline: "",
      reviewId: type === TicketType.REVIEW ? rid : "",
      surveyResponseId:
        type === TicketType.SURVEY_RESPONSE ? surveyResponseId : "",
    },
    validate: {
      title: (value) => (value.length ? null : translations("Cannot be empty")),
      firstComment: (value) =>
        value.trim().split(" ").length >= 2
          ? null
          : translations("Minimum 2 words required"),
      assignedToId: (value) =>
        value.length ? null : translations("Team staff selection is required"),
      priority: (value) =>
        value.length ? null : translations("Priority selection is required"),
    },
  });

  const {
    isLoading: isLoadingMembers,
    data: teamsMembersData,
    refetch: refetchInvitedTeamMembers,
  } = useTeamMembersFromInvitation(
    selectedTeamId || form.values.teamId,
  ) as UseTeamResult;

  const memberOptions = teamsMembersData?.members?.map((team) => ({
    value: team.id,
    label: team.name,
  }));

  useEffect(() => {
    if (rid) form.setFieldValue("reviewId", rid);
  }, [rid]);

  useEffect(() => {
    if (selectedTeamId) form.setFieldValue("teamId", selectedTeamId);
  }, [selectedTeamId, createTicketOpened]);

  useEffect(() => {
    if (surveyResponseId)
      form.setFieldValue("surveyResponseId", surveyResponseId);
  }, [surveyResponseId]);

  const createTicket = useCreateTicketMutation();

  const onSubmit = () => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    notifications.show({
      id: "load-data",
      loading: true,
      title: translations("Creating Ticket"),
      message: translations("Hold on, your ticket is getting created"),
      autoClose: false,
      withCloseButton: true,
    });

    createTicket.mutate(form.values, {
      onSuccess: (res) => {
        if (res.id) {
          closeAll();
        }
      },
    });
  };

  function closeAll() {
    form.reset();
    closeTicketModal();
  }

  return (
    <FormModalLayout
      opened={createTicketOpened}
      onClose={closeAll}
      title={translations("Create Ticket")}
      centered
      size="xl"
    >
      <Stack mt="lg">
        <Group>
          <ContainedTextField
            placeholder={translations("Enter Ticket Name")}
            label={translations("Name:")}
            withAsterisk
            {...form.getInputProps("title")}
            style={{
              minWidth:
                form.values.title === "Survey Response Ticket" ? "100%" : "65%",
            }}
          />
          {isCustomTicket && (
            <TeamSelector
              value={form.values.teamId}
              onChange={(teamId) => form.setFieldValue("teamId", teamId)}
              enableAll={false}
              label={translations("Select Team")}
              style={{ minWidth: "32%" }}
              withAsterisk
            />
          )}
        </Group>

        <ContainedTextArea
          placeholder={
            isCustomTicket
              ? translations("Enter description")
              : translations("Enter Comment")
          }
          label={
            isCustomTicket
              ? translations("Description")
              : translations("Comment")
          }
          withAsterisk
          autosize
          maxRows={4}
          minRows={4}
          {...form.getInputProps("firstComment")}
        />
        <Group>
          <ContainedSelection
            allowDeselect={false}
            data={memberOptions}
            withAsterisk
            label={translations("Assign to")}
            style={{ minWidth: "32%" }}
            placeholder={translations(
              "Select a team staff to assign ticket to",
            )}
            {...form.getInputProps("assignedToId")}
          />
          <ContainedSelection
            allowDeselect={false}
            data={["LOW", "MEDIUM", "HIGH", "CRITICAL"]}
            withAsterisk
            label={translations("Priority")}
            style={{ minWidth: "30%" }}
            placeholder={translations("Select priority for the ticket")}
            {...form.getInputProps("priority")}
          />
          <ContainedDateInput
            minDate={new Date()}
            clearable
            label={translations("Deadline:")}
            style={{ minWidth: "32%" }}
            placeholder={translations("Select a deadline for the ticket")}
            {...form.getInputProps("deadline")}
          />
        </Group>

        <Group justify="flex-end" mt="sm">
          <RateupButtonBlue
            mt="xl"
            title={translations("Cancel")}
            onClick={() => {
              closeAll();
            }}
          />

          <RateupButtonBlue
            mt="xl"
            title={translations("Create")}
            leftIcon={<IconPlus />}
            onClick={onSubmit}
          />
        </Group>
      </Stack>
    </FormModalLayout>
  );
};

export const CreateTicketCard = ({ opened, close, type, hasTicketFeature }) => {
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const { boards, isLoading: isBoardsLoading } =
    useBoardQueries(hasTicketFeature);
  const { createCard, board, isLoading } = useBoard(selectedBoardId);

  const form = useForm({
    initialValues: {
      ticketColumnId: "",
      title: "",
      description: "",
      type,
    },
    validate: {
      ticketColumnId: isNotEmpty("required"),
      title: isNotEmpty("required"),
    },
  });

  function handleSubmit() {
    if (form.validate().hasErrors) return;
    createCard(form.values, {
      onSuccess: () => {
        cancel();
      },
    });
  }

  function cancel() {
    form.reset();
    close();
  }

  return (
    <FormModalLayout
      title="Create Ticket"
      opened={opened}
      onClose={close}
      buttonTitle="create"
      onSubmit={handleSubmit}
      cancelOnClick={cancel}
      includeCancelButton
    >
      {isBoardsLoading || isLoading ? (
        <Loading />
      ) : (
        <Stack>
          <ContainedSelection
            data={
              boards ? boards.map((b) => ({ value: b.id, label: b.title })) : []
            }
            onChange={setSelectedBoardId}
            value={selectedBoardId}
            label={"Select Board"}
          />
          <ContainedSelection
            data={
              board?.ticketColumns
                ? board?.ticketColumns.map((column) => ({
                    value: column.id,
                    label: column.title,
                  }))
                : []
            }
            {...form.getInputProps("ticketColumnId")}
            label={"Select List"}
          />
          <ContainedTextField
            {...form.getInputProps("title")}
            label={"title"}
          />
          <ContainedTextArea
            {...form.getInputProps("description")}
            label={"Description"}
          />
        </Stack>
      )}
    </FormModalLayout>
  );
};

export default CreateTicketModal;
