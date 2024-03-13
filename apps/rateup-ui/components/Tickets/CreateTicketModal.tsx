import React, { useEffect, useState } from "react";
import FormModalLayout from "../Modal/FormModalLayout";
import { Group, Stack } from "@mantine/core";
import { RateupButtonBlue } from "../Button/RateupButtons";
import { notifications } from "@mantine/notifications";
import { useForm } from "@mantine/form";
import { IconPlus } from "@tabler/icons-react";
import {
  ContainedDateInput,
  ContainedSelection,
  ContainedTextArea,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import { useTeamMembersFromInvitation } from "../../backend/team/team.query";
import { useCreateTicketMutation } from "../../backend/tickets/tickets.query";
import { TicketType } from "../../utils/enums/ticket";
import ConfirmationModal from "../Modal/ConfirmationModal";
import { useDisclosure } from "@mantine/hooks";

interface iProps {
  createTicketOpened: boolean;
  openTicketModal: any;
  closeTicketModal: any;
  selectedTeamId: string;
  type: string;
  rid?: string;
  surveyResponseId?: string;
}
const CreateTicketModal = ({
  createTicketOpened,
  openTicketModal,
  closeTicketModal,
  selectedTeamId,
  type,
  rid,
  surveyResponseId,
}: iProps) => {
  const {
    isLoading: isLoadingMembers,
    data: teamsMembersData,
    refetch: refetchInvitedTeamMembers,
  } = useTeamMembersFromInvitation(selectedTeamId) as UseTeamResult;

  const memberOptions = teamsMembersData?.members?.map((team) => ({
    value: team.id,
    label: team.name,
  }));

  const form = useForm({
    initialValues: {
      title:
        type === TicketType.REVIEW ? "Review Ticket" : "Survey Response Ticket",
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
      title: (value) => (value.length ? null : "Cannot be empty"),
      firstComment: (value) =>
        value.trim().split(" ").length >= 2 ? null : "Minimum 2 words required",
      assignedToId: (value) =>
        value.length ? null : "Team member selection is required",
      priority: (value) =>
        value.length ? null : "Priority selection is required",
    },
  });

  useEffect(() => {
    if (rid) form.setFieldValue("reviewId", rid);
  }, [rid]);

  useEffect(() => {
    if (selectedTeamId) form.setFieldValue("teamId", selectedTeamId);
  }, [selectedTeamId]);

  useEffect(() => {
    if (surveyResponseId)
      form.setFieldValue("surveyResponseId", surveyResponseId);
  }, [surveyResponseId]);

  const createTicket = useCreateTicketMutation();
  const [dialogOpened, { toggle: openSuccessDialog, close: closeDialog }] =
    useDisclosure(false);
  const [createdTicketId, setCreatedTicketId] = useState("");

  const onSubmit = () => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    notifications.show({
      id: "load-data",
      loading: true,
      title: "Creating Ticket",
      message: `Hold on, your ticket is getting created...`,
      autoClose: false,
      withCloseButton: true,
    });

    createTicket.mutate(form.values, {
      onSuccess: (res) => {
        setCreatedTicketId(res.id);
      },
    });
  };

  useEffect(() => {
    createdTicketId && openSuccessDialog();
  }, [createdTicketId]);

  function closeAll() {
    closeDialog();
    closeTicketModal();
    form.reset();
    setCreatedTicketId("");
  }

  return (
    <FormModalLayout
      opened={createTicketOpened}
      onClose={closeAll}
      title={"Create Ticket"}
      centered
      size="xl"
    >
      <ConfirmationModal
        opened={dialogOpened}
        onClose={() => {
          closeAll();
        }}
        headerLabel={`Successfully created ticket for the ${type === TicketType.SURVEY_RESPONSE ? "Survey Response" : "Review"}`}
        headerTitle="Ticket Created"
        confirmLabel="View Ticket"
        onConfirm={(e) => {
          if (createdTicketId) {
            let url = `/dashboard/tickets/${createdTicketId}`;
            window.open(url, "_blank");
          }
          closeAll();
        }}
      />

      <Stack mt="lg">
        <ContainedTextField
          placeholder={"Enter Ticket Name"}
          label={"Name:"}
          withAsterisk
          {...form.getInputProps("title")}
        />

        <ContainedTextArea
          placeholder={"Enter Comment"}
          label={"Comment"}
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
            label={"Assign to"}
            placeholder="Select a team member to assign ticket to"
            {...form.getInputProps("assignedToId")}
          />
          <ContainedSelection
            allowDeselect={false}
            data={["LOW", "MEDIUM", "HIGH", "CRITICAL"]}
            withAsterisk
            label={"Priority"}
            placeholder="Select priority for the ticket"
            {...form.getInputProps("priority")}
          />
          <ContainedDateInput
            minDate={new Date()}
            clearable
            label={"Deadline:"}
            placeholder="Select a deadline for the ticket"
            {...form.getInputProps("deadline")}
          />
        </Group>

        <Group justify="flex-end" mt="sm">
          <RateupButtonBlue
            mt="xl"
            title="Cancel"
            onClick={() => {
              closeAll();
            }}
          />

          <RateupButtonBlue
            mt="xl"
            title="Create"
            leftIcon={<IconPlus />}
            onClick={onSubmit}
          />
        </Group>
      </Stack>
    </FormModalLayout>
  );
};

export default CreateTicketModal;
