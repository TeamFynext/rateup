"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Group, Stack } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconPlus } from "@tabler/icons-react";
import { List, NotebookTabs, Sparkles, Ticket, Type } from "lucide-react";
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
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

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
  const [submitting, setSubmitting] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const { boards, isLoading: isBoardsLoading } =
    useBoardQueries(hasTicketFeature);
  const { createCard, board, isLoading } = useBoard(selectedBoardId);

  const t = useTranslations();

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
    setSubmitting(true);
    createCard(form.values, {
      onSuccess: () => {
        setSubmitting(false);
        cancel();
      },
    });
    setSubmitting(false);
  }

  function cancel() {
    form.reset();
    close();
  }

  return (
    <Dialog open={opened} onOpenChange={close}>
      <DialogContent className="p-0">
        <DialogHeader className="p-0">
          <DialogTitle className="p-0">
            <div className="flex items-center justify-start gap-2 bg-primary rounded-t-lg py-6 px-4">
              <div className="bg-white/40 p-2 rounded-md text-white">
                <Ticket />
              </div>
              <h1 className="text-xl font-semibold text-white">
                Create Ticket
              </h1>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isBoardsLoading || isLoading ? (
          <div className="min-h-[60vh] w-full">
            <Loading />
          </div>
        ) : (
          <form
            onSubmit={form.onSubmit(handleSubmit)}
            className="w-full p-4 flex flex-col gap-4 justify-center"
          >
            {/* Select Board */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="bg-orange-100 text-orange-600 p-1 rounded-sm">
                  <List size={14} />
                </div>
                <div>
                  {t("Select Board")}
                  <span className="text-red-500">*</span>
                </div>
              </Label>

              <Select
                value={selectedBoardId}
                onValueChange={(val) => {
                  setSelectedBoardId(val);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("Select Board")} />
                </SelectTrigger>

                <SelectContent>
                  {boards?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select List */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="bg-blue-100 text-blue-600 p-1 rounded-sm">
                  <Sparkles size={14} />
                </div>
                <div>
                  {t("Select List")}
                  <span className="text-red-500">*</span>
                </div>
              </Label>

              <Select
                value={form.values.ticketColumnId}
                onValueChange={(val) =>
                  form.setFieldValue("ticketColumnId", val)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("Select List")} />
                </SelectTrigger>

                <SelectContent>
                  {board?.ticketColumns?.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* validation error for ticketColumnId */}
              {form.errors.ticketColumnId && (
                <p className="text-xs text-red-500 mt-1">
                  {form.errors.ticketColumnId}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="bg-purple-100 text-purple-600 p-1 rounded-sm">
                  <Type size={14} />
                </div>
                <div>
                  {t("Title")} <span className="text-red-500">*</span>
                </div>
              </Label>

              <Input
                placeholder={t("Enter ticket title")}
                {...form.getInputProps("title")}
              />
              {form.errors.title && (
                <p className="text-xs text-red-500 mt-1">{form.errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="bg-green-100 text-green-600 p-1 rounded-sm">
                  <NotebookTabs size={14} />
                </div>
                <div>
                  {t("Description")}
                  <span className="text-red-500">*</span>
                </div>
              </Label>

              <Textarea
                placeholder={t("Provide detailed information about the ticket")}
                {...form.getInputProps("description")}
              />
            </div>

            <div className="w-full flex justify-end items-center gap-4">
              <Button type="button" onClick={cancel} variant="outline">
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("Creating") : t("Create Ticket")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateTicketModal;
